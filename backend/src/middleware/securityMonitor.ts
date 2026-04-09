import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

interface RequestMetrics {
  timestamp: string;
  method: string;
  url: string;
  ipAddress: string;
  userAgent: string;
  statusCode: number;
  durationMs: number;
  userId: string;
}

// In-memory storage for request metrics (last 1000 requests)
const requestHistory: RequestMetrics[] = [];
const MAX_HISTORY = 1000;

// Track failed auth attempts by IP
const failedAuthAttempts = new Map<string, { count: number; lastAttempt: Date }>();
const FAILED_AUTH_THRESHOLD = 5;
const FAILED_AUTH_WINDOW = 5 * 60 * 1000; // 5 minutes

// Track request rates by IP
const requestRates = new Map<string, { count: number; windowStart: Date }>();
const RATE_LIMIT_THRESHOLD = 100;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

// Per-IP 404 counters — avoids O(n²) scan of requestHistory on every request
const notFoundCounts = new Map<string, { count: number; windowStart: number }>();
const NOT_FOUND_THRESHOLD = 20;
const NOT_FOUND_WINDOW = 5 * 60 * 1000; // 5 minutes

// Blocked IPs (temporary ban for severe violations)
const blockedIPs = new Map<string, Date>();
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes

/**
 * Sanitize URL to remove potential attack payloads from logs
 */
function sanitizeUrl(url: string): string {
  if (!url) return '';
  // Truncate excessively long URLs (potential DoS via logs)
  const truncated = url.length > 500 ? url.substring(0, 500) + '...[truncated]' : url;
  // Remove potential script injections from logs
  return truncated.replace(/<[^>]*>/g, '[removed]');
}

/**
 * Extract client IP safely
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    // Take the first IP and validate it's reasonable
    const ip = forwarded.split(',')[0].trim();
    if (ip && ip.length < 50) return ip;
  }
  return req.socket.remoteAddress || 'unknown';
}

/**
 * Check if IP is currently blocked
 */
function isBlocked(ip: string): boolean {
  const blockedUntil = blockedIPs.get(ip);
  if (!blockedUntil) return false;
  if (Date.now() > blockedUntil.getTime()) {
    blockedIPs.delete(ip);
    return false;
  }
  return true;
}

/**
 * Security monitoring middleware
 * Tracks requests and detects suspicious patterns
 */
export function securityMonitor(req: Request, res: Response, next: NextFunction) {
  const start = performance.now();
  const ipAddress = getClientIP(req);

  // Check if IP is blocked
  if (isBlocked(ipAddress)) {
    return res.status(403).json({ error: 'Access temporarily blocked due to suspicious activity' });
  }

  // Early threat detection on request (before processing)
  const sanitizedUrl = sanitizeUrl(req.originalUrl);
  if (hasSQLInjectionPattern(req.originalUrl) || hasXSSPattern(req.originalUrl)) {
    logger.warn({ ip: ipAddress }, 'security: blocked malicious request');
    blockIP(ipAddress);
    return res.status(400).json({ error: 'Invalid request' });
  }

  // Track request rate
  const rateExceeded = trackRequestRate(ipAddress);
  if (rateExceeded) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  res.on('finish', () => {
    const durationMs = Math.round(performance.now() - start);
    
    const metrics: RequestMetrics = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: sanitizedUrl,
      ipAddress,
      userAgent: (req.headers['user-agent'] || 'unknown').substring(0, 200),
      statusCode: res.statusCode,
      durationMs,
      // Never log email/PII - use ID only
      userId: (req as any).user?.id || 'anonymous'
    };
    
    // Store in history (circular buffer)
    requestHistory.push(metrics);
    if (requestHistory.length > MAX_HISTORY) {
      requestHistory.shift();
    }

    // Detect security threats
    detectThreats(metrics);
  });

  next();
}

/**
 * Block an IP temporarily
 */
function blockIP(ip: string) {
  blockedIPs.set(ip, new Date(Date.now() + BLOCK_DURATION));
  logger.error({ ip }, 'security: IP blocked');
}

/**
 * Track request rate for an IP address
 * Returns true if rate limit exceeded
 */
function trackRequestRate(ip: string): boolean {
  const now = new Date();
  const existing = requestRates.get(ip);

  if (!existing || now.getTime() - existing.windowStart.getTime() > RATE_LIMIT_WINDOW) {
    // Start new window
    requestRates.set(ip, { count: 1, windowStart: now });
    return false;
  } else {
    // Increment count in current window
    existing.count++;
    
    if (existing.count > RATE_LIMIT_THRESHOLD) {
      logger.warn({ ip }, 'security: rate limit exceeded');
      return true;
    }
    return false;
  }
}

/**
 * Detect security threats based on request patterns
 */
function detectThreats(metrics: RequestMetrics) {
  // Detect brute force auth attempts
  if (metrics.url.includes('/auth/') && metrics.statusCode === 401) {
    trackFailedAuth(metrics.ipAddress);
  }

  // Detect scanning behavior (many 404s) — O(1) using per-IP counter
  if (metrics.statusCode === 404) {
    const now = Date.now();
    const existing = notFoundCounts.get(metrics.ipAddress);
    if (!existing || now - existing.windowStart > NOT_FOUND_WINDOW) {
      notFoundCounts.set(metrics.ipAddress, { count: 1, windowStart: now });
    } else {
      existing.count++;
      if (existing.count > NOT_FOUND_THRESHOLD) {
        logger.warn({ ip: metrics.ipAddress }, 'security: potential scanning detected');
        blockIP(metrics.ipAddress);
        notFoundCounts.delete(metrics.ipAddress);
      }
    }
  }

  if (metrics.durationMs > 10000) {
    logger.warn({ method: metrics.method, url: metrics.url.substring(0, 50), durationMs: metrics.durationMs }, 'performance: slow request');
  }
}

/**
 * Track failed authentication attempts
 */
function trackFailedAuth(ip: string) {
  const now = new Date();
  const existing = failedAuthAttempts.get(ip);

  if (!existing || now.getTime() - existing.lastAttempt.getTime() > FAILED_AUTH_WINDOW) {
    // Start new tracking window
    failedAuthAttempts.set(ip, { count: 1, lastAttempt: now });
  } else {
    // Increment count
    existing.count++;
    existing.lastAttempt = now;

    if (existing.count >= FAILED_AUTH_THRESHOLD) {
      logger.error({ ip }, 'security: brute force detected');
      blockIP(ip);
    }
  }
}

/**
 * Check for SQL injection patterns
 */
function hasSQLInjectionPattern(url: string): boolean {
  if (!url) return false;
  const sqlPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i,
    /exec(\s|\+)+(s|x)p\w+/i,
    /select\s+.*\s+from/i,
    /insert\s+into/i,
    /delete\s+from/i,
    /drop\s+(table|database)/i,
  ];
  
  try {
    const decoded = decodeURIComponent(url);
    return sqlPatterns.some(pattern => pattern.test(decoded));
  } catch {
    return sqlPatterns.some(pattern => pattern.test(url));
  }
}

/**
 * Check for XSS patterns
 */
function hasXSSPattern(url: string): boolean {
  if (!url) return false;
  const xssPatterns = [
    /<script[^>]*>/gi,
    /javascript:/gi,
    /onerror\s*=/gi,
    /onload\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /eval\s*\(/gi,
    /document\.(cookie|write|location)/gi,
  ];
  
  try {
    const decoded = decodeURIComponent(url);
    return xssPatterns.some(pattern => pattern.test(decoded));
  } catch {
    return xssPatterns.some(pattern => pattern.test(url));
  }
}

/**
 * Get security statistics (sanitized for API response)
 */
export function getSecurityStats() {
  const now = new Date();
  const last5Minutes = now.getTime() - 5 * 60 * 1000;
  
  const recentRequests = requestHistory.filter(
    r => new Date(r.timestamp).getTime() > last5Minutes
  );

  return {
    totalRequests: requestHistory.length,
    recentRequests: recentRequests.length,
    failedAuthAttempts: failedAuthAttempts.size,
    blockedIPs: blockedIPs.size,
    topIPs: getTopIPs(recentRequests),
    statusCodes: getStatusCodeDistribution(recentRequests),
    averageResponseTime: calculateAverageResponseTime(recentRequests),
    slowestEndpoints: getSlowestEndpoints(recentRequests)
  };
}

function getTopIPs(requests: RequestMetrics[]) {
  const ipCounts = new Map<string, number>();
  requests.forEach(r => {
    ipCounts.set(r.ipAddress, (ipCounts.get(r.ipAddress) || 0) + 1);
  });
  
  return Array.from(ipCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ip, count]) => ({ ip, count }));
}

function getStatusCodeDistribution(requests: RequestMetrics[]) {
  const statusCounts = new Map<number, number>();
  requests.forEach(r => {
    statusCounts.set(r.statusCode, (statusCounts.get(r.statusCode) || 0) + 1);
  });
  
  return Object.fromEntries(statusCounts);
}

function calculateAverageResponseTime(requests: RequestMetrics[]) {
  if (requests.length === 0) return 0;
  const total = requests.reduce((sum, r) => sum + r.durationMs, 0);
  return Math.round(total / requests.length);
}

function getSlowestEndpoints(requests: RequestMetrics[]) {
  return requests
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 10)
    .map(r => ({
      url: r.url,
      method: r.method,
      durationMs: r.durationMs,
      timestamp: r.timestamp
    }));
}