import { Request, Response, NextFunction } from 'express';

interface RequestMetrics {
  timestamp: string;
  method: string;
  url: string;
  ipAddress: string;
  userAgent: string;
  statusCode: number;
  durationMs: number;
  user: string;
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

/**
 * Security monitoring middleware
 * Tracks requests and detects suspicious patterns
 */
export function securityMonitor(req: Request, res: Response, next: NextFunction) {
  console.log('🔍 [Security Monitor] Request:', req.method, req.originalUrl);
  const start = performance.now();
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';

  // Track request rate
  trackRequestRate(ipAddress);

  res.on('finish', () => {
    const durationMs = Math.round(performance.now() - start);
    
    const metrics: RequestMetrics = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      ipAddress,
      userAgent: req.headers['user-agent'] || 'unknown',
      statusCode: res.statusCode,
      durationMs,
      user: (req as any).user?.email || 'anonymous'
    };

    console.log('📊 [Security Monitor] Storing request:', metrics.method, metrics.url, 'Status:', metrics.statusCode);
    
    // Store in history (circular buffer)
    requestHistory.push(metrics);
    console.log('📊 [Security Monitor] Total requests tracked:', requestHistory.length);
    
    if (requestHistory.length > MAX_HISTORY) {
      requestHistory.shift();
    }

    // Detect security threats
    detectThreats(metrics);
  });

  next();
}

/**
 * Track request rate for an IP address
 */
function trackRequestRate(ip: string) {
  const now = new Date();
  const existing = requestRates.get(ip);

  if (!existing || now.getTime() - existing.windowStart.getTime() > RATE_LIMIT_WINDOW) {
    // Start new window
    requestRates.set(ip, { count: 1, windowStart: now });
  } else {
    // Increment count in current window
    existing.count++;
    
    if (existing.count > RATE_LIMIT_THRESHOLD) {
      console.warn(`🚨 [SECURITY] Rate limit exceeded: ${ip} made ${existing.count} requests in 1 minute`);
    }
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

  // Detect potential SQL injection attempts
  if (hasSQLInjectionPattern(metrics.url)) {
    console.warn(`🚨 [SECURITY] Potential SQL injection attempt from ${metrics.ipAddress}: ${metrics.url}`);
  }

  // Detect potential XSS attempts
  if (hasXSSPattern(metrics.url)) {
    console.warn(`🚨 [SECURITY] Potential XSS attempt from ${metrics.ipAddress}: ${metrics.url}`);
  }

  // Detect scanning behavior (many 404s)
  const recent404s = requestHistory.filter(
    r => r.ipAddress === metrics.ipAddress && r.statusCode === 404
  ).length;
  
  if (recent404s > 20) {
    console.warn(`🚨 [SECURITY] Potential scanning detected from ${metrics.ipAddress}: ${recent404s} 404 errors`);
  }

  // Detect slow requests (potential DoS)
  if (metrics.durationMs > 5000) {
    console.warn(`⚠️  [PERFORMANCE] Slow request detected: ${metrics.method} ${metrics.url} took ${metrics.durationMs}ms`);
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
      console.error(`🚨 [SECURITY] BRUTE FORCE DETECTED: ${ip} has ${existing.count} failed auth attempts in 5 minutes`);
    }
  }
}

/**
 * Check for SQL injection patterns
 */
function hasSQLInjectionPattern(url: string): boolean {
  const sqlPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i,
    /exec(\s|\+)+(s|x)p\w+/i,
  ];
  
  try {
    return sqlPatterns.some(pattern => pattern.test(url));
  } catch (e) {
    return false;
  }
}

/**
 * Check for XSS patterns
 */
function hasXSSPattern(url: string): boolean {
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /onerror\s*=/gi,
    /onload\s*=/gi,
    /<iframe/gi,
  ];
  
  try {
    return xssPatterns.some(pattern => pattern.test(decodeURIComponent(url)));
  } catch (e) {
    return false;
  }
}

/**
 * Get security statistics
 */
export function getSecurityStats() {
  console.log('📊 [getSecurityStats] Called! requestHistory length:', requestHistory.length);
  console.log('📊 [getSecurityStats] failedAuthAttempts size:', failedAuthAttempts.size);
  
  const now = new Date();
  const last5Minutes = now.getTime() - 5 * 60 * 1000;
  
  const recentRequests = requestHistory.filter(
    r => new Date(r.timestamp).getTime() > last5Minutes
  );

  const stats = {
    totalRequests: requestHistory.length,
    recentRequests: recentRequests.length,
    failedAuthAttempts: Array.from(failedAuthAttempts.entries()).map(([ip, data]) => ({
      ip,
      count: data.count,
      lastAttempt: data.lastAttempt.toISOString()
    })),
    topIPs: getTopIPs(recentRequests),
    statusCodes: getStatusCodeDistribution(recentRequests),
    averageResponseTime: calculateAverageResponseTime(recentRequests),
    slowestEndpoints: getSlowestEndpoints(recentRequests)
  };
  
  console.log('📊 [getSecurityStats] Returning stats:', JSON.stringify(stats, null, 2));
  return stats;
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