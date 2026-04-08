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
 * Extract client IP safely.
 * Uses req.ip which respects the trust proxy setting configured in server.ts.
 * Never reads X-Forwarded-For directly — that is spoofable in environments
 * where trust proxy is false (dev/test).
 */
function getClientIP(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
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

  // Sanitize URL for safe logging — do not use for security decisions
  const sanitizedUrl = sanitizeUrl(req.originalUrl);

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
 * Track request rate for an IP address.
 * Returns true if rate limit exceeded.
 * Expired windows are pruned to prevent unbounded memory growth.
 */
function trackRequestRate(ip: string): boolean {
  const now = Date.now();

  // Prune expired entries periodically (every ~100 calls)
  if (Math.random() < 0.01) {
    for (const [key, val] of requestRates) {
      if (now - val.windowStart.getTime() > RATE_LIMIT_WINDOW * 2) {
        requestRates.delete(key);
      }
    }
  }

  const existing = requestRates.get(ip);
  if (!existing || now - existing.windowStart.getTime() > RATE_LIMIT_WINDOW) {
    requestRates.set(ip, { count: 1, windowStart: new Date(now) });
    return false;
  }

  existing.count++;
  if (existing.count > RATE_LIMIT_THRESHOLD) {
    logger.warn({ ip }, 'security: rate limit exceeded');
    return true;
  }
  return false;
}

/**
 * Detect security threats based on request patterns
 */
function detectThreats(metrics: RequestMetrics) {
  // Detect brute force auth attempts
  if (metrics.url.includes('/auth/') && metrics.statusCode === 401) {
    trackFailedAuth(metrics.ipAddress);
  }

  // Detect scanning behavior (many 404s)
  const recent404s = requestHistory.filter(
    r => r.ipAddress === metrics.ipAddress && r.statusCode === 404
  ).length;
  
  if (recent404s > 20) {
    logger.warn({ ip: metrics.ipAddress }, 'security: potential scanning detected');
    blockIP(metrics.ipAddress);
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