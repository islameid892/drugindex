import { metrics } from "../metrics";
import { searchCache, analyticsCache } from "../cache";

/**
 * Middleware to automatically record metrics for cache hits/misses
 */
export function recordCacheMetrics(cacheKey: string, found: boolean): void {
  if (found) {
    metrics.recordCacheHit();
  } else {
    metrics.recordCacheMiss();
  }
}

/**
 * Middleware to record request metrics
 */
export function recordRequestMetrics(
  type: 'search' | 'analytics' | 'other',
  responseTimeMs: number,
  hasError: boolean = false
): void {
  metrics.recordRequest(type);
  metrics.recordResponseTime(responseTimeMs);
  if (hasError) {
    metrics.recordError();
  }
}

/**
 * Middleware to record rate limit violations
 */
export function recordRateLimitMetrics(ip: string): void {
  metrics.recordRateLimitViolation(ip);
}

/**
 * Helper to measure execution time
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}

/**
 * Get cache statistics for dashboard
 */
export function getCacheStats() {
  const searchCacheStats = searchCache.getStats();
  const analyticsCacheStats = analyticsCache.getStats();
  const metricsCache = metrics.getCacheMetrics();
  
  return {
    search: {
      size: searchCacheStats.size,
      maxSize: searchCacheStats.maxSize,
      ttlMinutes: searchCacheStats.ttlMinutes,
    },
    analytics: {
      size: analyticsCacheStats.size,
      maxSize: analyticsCacheStats.maxSize,
      ttlMinutes: analyticsCacheStats.ttlMinutes,
    },
    metrics: {
      hits: metricsCache.hits,
      misses: metricsCache.misses,
      hitRate: metricsCache.hitRate,
    },
  };
}

/**
 * Get performance statistics
 */
export function getPerformanceStats() {
  const report = metrics.getReport();
  return {
    uptime: report.uptime,
    totalRequests: report.totalRequests,
    requestsPerSecond: report.requestsPerSecond,
    errorRate: report.errorRate,
    cache: report.cache,
    rateLimit: report.rateLimit,
    responseTime: report.responseTime,
  };
}
