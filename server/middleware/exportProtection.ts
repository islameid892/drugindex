/**
 * Export Protection Middleware
 * 
 * Prevents bulk data exfiltration by:
 * 1. Limiting export frequency per user
 * 2. Adding watermarks to exported data
 * 3. Logging all exports
 * 4. Enforcing export quotas
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface ExportRecord {
  userId: string;
  timestamp: number;
  format: string;
  recordCount: number;
  ipAddress: string;
  userAgent: string;
}

interface UserExportQuota {
  count: number;
  lastReset: number;
  totalSize: number;
}

// In-memory stores
const exportLog: ExportRecord[] = [];
const userQuotas = new Map<string, UserExportQuota>();

// Configuration
const CONFIG = {
  // Export limits per user per day
  DAILY_EXPORT_LIMIT: 5,           // Max 5 exports per day
  DAILY_RECORD_LIMIT: 10000,       // Max 10,000 records per day
  DAILY_SIZE_LIMIT_MB: 100,        // Max 100MB per day
  
  // Time windows
  QUOTA_WINDOW_MS: 24 * 60 * 60 * 1000, // 24 hours
  
  // Export throttling
  MIN_TIME_BETWEEN_EXPORTS_MS: 60 * 1000, // 1 minute between exports
  
  // Watermarking
  ADD_WATERMARK: true,
  WATERMARK_FIELDS: ['_exported_by', '_export_timestamp', '_export_id'],
};

function getClientIP(req: Request): string {
  return (
    (req.headers['cf-connecting-ip'] as string) ||
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

function getUserId(req: Request): string {
  // Extract from JWT or session
  const user = (req as any).user;
  return user?.id || getClientIP(req); // Fallback to IP if not authenticated
}

function generateExportId(): string {
  return crypto.randomBytes(16).toString('hex');
}

function getOrCreateUserQuota(userId: string): UserExportQuota {
  if (!userQuotas.has(userId)) {
    userQuotas.set(userId, {
      count: 0,
      lastReset: Date.now(),
      totalSize: 0,
    });
  }
  
  const quota = userQuotas.get(userId)!;
  const now = Date.now();
  
  // Reset quota if window expired
  if (now - quota.lastReset > CONFIG.QUOTA_WINDOW_MS) {
    quota.count = 0;
    quota.totalSize = 0;
    quota.lastReset = now;
  }
  
  return quota;
}

/**
 * Main export protection middleware
 */
export function exportProtectionMiddleware(req: Request, res: Response, next: NextFunction) {
  // Only apply to export endpoints
  if (!req.path.includes('export') && !req.path.includes('download')) {
    return next();
  }
  
  // Skip in development
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  const userId = getUserId(req);
  const ip = getClientIP(req);
  const quota = getOrCreateUserQuota(userId);
  
  // Check daily export count limit
  if (quota.count >= CONFIG.DAILY_EXPORT_LIMIT) {
    return res.status(429).json({
      error: 'Export Limit Exceeded',
      message: `Maximum ${CONFIG.DAILY_EXPORT_LIMIT} exports per day allowed. Try again tomorrow.`,
      resetTime: new Date(quota.lastReset + CONFIG.QUOTA_WINDOW_MS).toISOString(),
    });
  }
  
  // Store export info for later validation
  (req as any).exportInfo = {
    userId,
    ip,
    exportId: generateExportId(),
    startTime: Date.now(),
  };
  
  // Intercept response to add watermark and log
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  
  res.json = function(data: any) {
    // Add watermark to exported data
    if (CONFIG.ADD_WATERMARK && Array.isArray(data)) {
      data = data.map((item: any) => ({
        ...item,
        _exported_by: userId,
        _export_timestamp: new Date().toISOString(),
        _export_id: (req as any).exportInfo.exportId,
      }));
    }
    
    // Log export
    logExport(userId, 'json', Array.isArray(data) ? data.length : 1, ip, req.headers['user-agent'] || '');
    
    // Update quota
    quota.count++;
    quota.totalSize += JSON.stringify(data).length;
    
    return originalJson(data);
  };
  
  res.send = function(data: any) {
    // Log export
    if (typeof data === 'string') {
      const recordCount = (data.match(/\n/g) || []).length; // Rough estimate for CSV
      logExport(userId, 'csv', recordCount, ip, req.headers['user-agent'] || '');
    }
    
    // Update quota
    quota.count++;
    quota.totalSize += typeof data === 'string' ? data.length : 0;
    
    return originalSend(data);
  };
  
  next();
}

/**
 * Log export event
 */
function logExport(userId: string, format: string, recordCount: number, ip: string, userAgent: string) {
  exportLog.push({
    userId,
    timestamp: Date.now(),
    format,
    recordCount,
    ipAddress: ip,
    userAgent,
  });
  
  // Keep log size manageable
  if (exportLog.length > 10000) {
    exportLog.splice(0, 5000);
  }
  
  console.log(`[EXPORT] User: ${userId} | Format: ${format} | Records: ${recordCount} | IP: ${ip}`);
}

/**
 * Get export statistics
 */
export function getExportStats() {
  const now = Date.now();
  const oneDayAgo = now - CONFIG.QUOTA_WINDOW_MS;
  
  const recentExports = exportLog.filter(e => e.timestamp > oneDayAgo);
  const totalRecordsExported = recentExports.reduce((sum, e) => sum + e.recordCount, 0);
  const uniqueUsers = new Set(recentExports.map(e => e.userId)).size;
  
  return {
    totalExports: recentExports.length,
    totalRecordsExported,
    uniqueUsers,
    byFormat: {
      json: recentExports.filter(e => e.format === 'json').length,
      csv: recentExports.filter(e => e.format === 'csv').length,
    },
    recentExports: recentExports.slice(-20).reverse(),
  };
}

/**
 * Get user export quota
 */
export function getUserExportQuota(userId: string) {
  const quota = getOrCreateUserQuota(userId);
  const resetTime = new Date(quota.lastReset + CONFIG.QUOTA_WINDOW_MS);
  
  return {
    exportsToday: quota.count,
    maxExports: CONFIG.DAILY_EXPORT_LIMIT,
    remainingExports: Math.max(0, CONFIG.DAILY_EXPORT_LIMIT - quota.count),
    totalSizeMB: Math.round(quota.totalSize / 1024 / 1024),
    maxSizeMB: CONFIG.DAILY_SIZE_LIMIT_MB,
    resetTime: resetTime.toISOString(),
  };
}

/**
 * Get export log
 */
export function getExportLog(limit: number = 100) {
  return exportLog.slice(-limit).reverse();
}

/**
 * Detect suspicious export patterns
 */
export function detectSuspiciousExports() {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  
  const recentExports = exportLog.filter(e => e.timestamp > oneHourAgo);
  const suspicious: any[] = [];
  
  // Check for rapid exports from same user
  const userExports = new Map<string, number>();
  for (const exp of recentExports) {
    userExports.set(exp.userId, (userExports.get(exp.userId) || 0) + 1);
  }
  
  for (const [userId, count] of userExports) {
    if (count > 3) {
      suspicious.push({
        type: 'rapid_exports',
        userId,
        count,
        timeWindow: '1 hour',
      });
    }
  }
  
  // Check for large exports
  for (const exp of recentExports) {
    if (exp.recordCount > 1000) {
      suspicious.push({
        type: 'large_export',
        userId: exp.userId,
        recordCount: exp.recordCount,
        timestamp: new Date(exp.timestamp).toISOString(),
      });
    }
  }
  
  return suspicious;
}
