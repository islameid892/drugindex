/**
 * Advanced Rate Limiter with Progressive Blocking
 * 
 * Levels:
 * 1. Warning: exceeded rate limit → 429 response
 * 2. Temp Ban: exceeded 3x in 10 minutes → 1 hour ban
 * 3. Permanent Ban: exceeded temp ban 3x → permanent block
 */

import { Request, Response, NextFunction } from 'express';

interface IPRecord {
  // Rate limiting
  requestCount: number;
  windowStart: number;
  
  // Progressive blocking
  violations: number;        // Number of rate limit violations
  lastViolation: number;     // Timestamp of last violation
  tempBanUntil: number;      // Timestamp when temp ban expires (0 = not banned)
  tempBanCount: number;      // How many temp bans this IP has received
  permanentBan: boolean;     // Permanently banned
  
  // Search-specific
  searchCount: number;
  searchWindowStart: number;
}

interface BlockedIP {
  ip: string;
  reason: string;
  bannedAt: number;
  banType: 'temp' | 'permanent';
  expiresAt?: number;
}

// In-memory stores
const ipRecords = new Map<string, IPRecord>();
const securityLog: Array<{
  timestamp: number;
  ip: string;
  userAgent: string;
  endpoint: string;
  action: string;
  details?: string;
}> = [];

// Configuration
const CONFIG = {
  // General rate limiting
  GLOBAL_WINDOW_MS: 60 * 1000,       // 1 minute window
  GLOBAL_MAX_REQUESTS: 60,            // 60 requests per minute
  
  // Search rate limiting
  SEARCH_WINDOW_MS: 60 * 1000,       // 1 minute window
  SEARCH_MAX_REQUESTS: 10,            // 10 searches per minute
  
  // Progressive blocking
  VIOLATIONS_FOR_TEMP_BAN: 3,        // 3 violations → temp ban
  VIOLATION_WINDOW_MS: 10 * 60 * 1000, // 10 minute window for violations
  TEMP_BAN_DURATION_MS: 60 * 60 * 1000, // 1 hour temp ban
  TEMP_BANS_FOR_PERMANENT: 3,        // 3 temp bans → permanent ban
  
  // Log max size
  MAX_LOG_SIZE: 10000,
};

function getIPRecord(ip: string): IPRecord {
  if (!ipRecords.has(ip)) {
    ipRecords.set(ip, {
      requestCount: 0,
      windowStart: Date.now(),
      violations: 0,
      lastViolation: 0,
      tempBanUntil: 0,
      tempBanCount: 0,
      permanentBan: false,
      searchCount: 0,
      searchWindowStart: Date.now(),
    });
  }
  return ipRecords.get(ip)!;
}

function getClientIP(req: Request): string {
  return (
    (req.headers['cf-connecting-ip'] as string) ||
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

function logSecurityEvent(
  ip: string,
  userAgent: string,
  endpoint: string,
  action: string,
  details?: string
) {
  securityLog.push({
    timestamp: Date.now(),
    ip,
    userAgent,
    endpoint,
    action,
    details,
  });
  
  // Keep log size manageable
  if (securityLog.length > CONFIG.MAX_LOG_SIZE) {
    securityLog.splice(0, 1000);
  }
}

function applyViolation(record: IPRecord, ip: string, userAgent: string, endpoint: string): 'warn' | 'temp_ban' | 'permanent_ban' {
  const now = Date.now();
  
  // Reset violations if outside violation window
  if (now - record.lastViolation > CONFIG.VIOLATION_WINDOW_MS) {
    record.violations = 0;
  }
  
  record.violations++;
  record.lastViolation = now;
  
  if (record.violations >= CONFIG.VIOLATIONS_FOR_TEMP_BAN) {
    record.tempBanCount++;
    record.violations = 0;
    
    if (record.tempBanCount >= CONFIG.TEMP_BANS_FOR_PERMANENT) {
      record.permanentBan = true;
      logSecurityEvent(ip, userAgent, endpoint, 'PERMANENT_BAN', 
        `After ${record.tempBanCount} temp bans`);
      return 'permanent_ban';
    }
    
    record.tempBanUntil = now + CONFIG.TEMP_BAN_DURATION_MS;
    logSecurityEvent(ip, userAgent, endpoint, 'TEMP_BAN', 
      `Ban #${record.tempBanCount}, expires in 1 hour`);
    return 'temp_ban';
  }
  
  logSecurityEvent(ip, userAgent, endpoint, 'RATE_LIMIT_VIOLATION', 
    `Violation #${record.violations}`);
  return 'warn';
}

/**
 * Main rate limiting middleware
 */
export function advancedRateLimiter(req: Request, res: Response, next: NextFunction) {
  // Skip in development
  if (process.env.NODE_ENV !== 'production') return next();
  
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || '';
  const endpoint = req.path;
  const now = Date.now();
  
  const record = getIPRecord(ip);
  
  // Check permanent ban
  if (record.permanentBan) {
    logSecurityEvent(ip, userAgent, endpoint, 'BLOCKED_PERMANENT');
    return res.status(403).json({
      error: 'Access Denied',
      message: 'Your access has been permanently restricted.',
    });
  }
  
  // Check temp ban
  if (record.tempBanUntil > now) {
    const remainingMs = record.tempBanUntil - now;
    const remainingMins = Math.ceil(remainingMs / 60000);
    logSecurityEvent(ip, userAgent, endpoint, 'BLOCKED_TEMP_BAN');
    return res.status(429).json({
      error: 'Temporarily Blocked',
      message: `Access temporarily restricted. Try again in ${remainingMins} minutes.`,
      retryAfter: Math.ceil(remainingMs / 1000),
    });
  }
  
  // Reset window if expired
  if (now - record.windowStart > CONFIG.GLOBAL_WINDOW_MS) {
    record.requestCount = 0;
    record.windowStart = now;
  }
  
  record.requestCount++;
  
  // Check global rate limit
  if (record.requestCount > CONFIG.GLOBAL_MAX_REQUESTS) {
    const banResult = applyViolation(record, ip, userAgent, endpoint);
    
    if (banResult === 'permanent_ban') {
      return res.status(403).json({
        error: 'Access Denied',
        message: 'Your access has been permanently restricted due to repeated violations.',
      });
    }
    
    if (banResult === 'temp_ban') {
      return res.status(429).json({
        error: 'Temporarily Blocked',
        message: 'Too many requests. Access restricted for 1 hour.',
        retryAfter: 3600,
      });
    }
    
    return res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'Too many requests. Please slow down.',
      limit: CONFIG.GLOBAL_MAX_REQUESTS,
      windowMs: CONFIG.GLOBAL_WINDOW_MS,
      retryAfter: Math.ceil((record.windowStart + CONFIG.GLOBAL_WINDOW_MS - now) / 1000),
    });
  }
  
  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', CONFIG.GLOBAL_MAX_REQUESTS);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, CONFIG.GLOBAL_MAX_REQUESTS - record.requestCount));
  res.setHeader('X-RateLimit-Reset', Math.ceil((record.windowStart + CONFIG.GLOBAL_WINDOW_MS) / 1000));
  
  next();
}

/**
 * Search-specific rate limiter (stricter)
 */
export function searchRateLimiter(req: Request, res: Response, next: NextFunction) {
  // Skip in development
  if (process.env.NODE_ENV !== 'production') return next();
  
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || '';
  const endpoint = req.path;
  const now = Date.now();
  
  const record = getIPRecord(ip);
  
  // Reset search window if expired
  if (now - record.searchWindowStart > CONFIG.SEARCH_WINDOW_MS) {
    record.searchCount = 0;
    record.searchWindowStart = now;
  }
  
  record.searchCount++;
  
  if (record.searchCount > CONFIG.SEARCH_MAX_REQUESTS) {
    const banResult = applyViolation(record, ip, userAgent, endpoint);
    
    if (banResult === 'permanent_ban') {
      return res.status(403).json({
        error: 'Access Denied',
        message: 'Your access has been permanently restricted.',
      });
    }
    
    if (banResult === 'temp_ban') {
      return res.status(429).json({
        error: 'Temporarily Blocked',
        message: 'Too many search requests. Access restricted for 1 hour.',
        retryAfter: 3600,
      });
    }
    
    return res.status(429).json({
      error: 'Search Rate Limit Exceeded',
      message: `Maximum ${CONFIG.SEARCH_MAX_REQUESTS} searches per minute allowed.`,
      limit: CONFIG.SEARCH_MAX_REQUESTS,
      retryAfter: Math.ceil((record.searchWindowStart + CONFIG.SEARCH_WINDOW_MS - now) / 1000),
    });
  }
  
  res.setHeader('X-Search-RateLimit-Limit', CONFIG.SEARCH_MAX_REQUESTS);
  res.setHeader('X-Search-RateLimit-Remaining', Math.max(0, CONFIG.SEARCH_MAX_REQUESTS - record.searchCount));
  
  next();
}

/**
 * Manually ban an IP
 */
export function banIP(ip: string, permanent: boolean = false, reason: string = 'Manual ban') {
  const record = getIPRecord(ip);
  if (permanent) {
    record.permanentBan = true;
  } else {
    record.tempBanUntil = Date.now() + CONFIG.TEMP_BAN_DURATION_MS;
    record.tempBanCount++;
  }
  logSecurityEvent(ip, '', '', permanent ? 'MANUAL_PERMANENT_BAN' : 'MANUAL_TEMP_BAN', reason);
}

/**
 * Unban an IP
 */
export function unbanIP(ip: string) {
  const record = ipRecords.get(ip);
  if (record) {
    record.permanentBan = false;
    record.tempBanUntil = 0;
    record.violations = 0;
    record.tempBanCount = 0;
  }
}

/**
 * Get security statistics
 */
export function getSecurityStats() {
  const now = Date.now();
  let permanentBans = 0;
  let tempBans = 0;
  let activeIPs = 0;
  
  for (const [, record] of ipRecords) {
    if (record.permanentBan) permanentBans++;
    else if (record.tempBanUntil > now) tempBans++;
    else activeIPs++;
  }
  
  // Recent events (last hour)
  const oneHourAgo = now - 3600000;
  const recentEvents = securityLog.filter(e => e.timestamp > oneHourAgo);
  
  return {
    totalTrackedIPs: ipRecords.size,
    permanentBans,
    tempBans,
    activeIPs,
    recentEvents: recentEvents.length,
    lastEvents: securityLog.slice(-20).reverse(),
  };
}

/**
 * Get security log
 */
export function getSecurityLog(limit: number = 100) {
  return securityLog.slice(-limit).reverse();
}

// Cleanup old records every hour
setInterval(() => {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  for (const [ip, record] of ipRecords.entries()) {
    // Remove non-banned IPs that haven't been seen in 24 hours
    if (!record.permanentBan && record.tempBanUntil < now) {
      if (now - record.windowStart > oneDay && now - record.searchWindowStart > oneDay) {
        ipRecords.delete(ip);
      }
    }
  }
}, 60 * 60 * 1000);
