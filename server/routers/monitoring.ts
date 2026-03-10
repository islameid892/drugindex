import { router, adminProcedure, publicProcedure } from "../_core/trpc";
import { metrics } from "../metrics";

export const monitoringRouter = router({
  /**
   * Get current metrics snapshot (public)
   */
  snapshot: publicProcedure.query(() => {
    return metrics.getSnapshot();
  }),

  /**
   * Get comprehensive metrics report (admin only)
   */
  report: adminProcedure.query(() => {
    return metrics.getReport();
  }),

  /**
   * Get cache metrics (public)
   */
  cache: publicProcedure.query(() => {
    return metrics.getCacheMetrics();
  }),

  /**
   * Get rate limit metrics (admin only)
   */
  rateLimit: adminProcedure.query(() => {
    return metrics.getRateLimitMetrics();
  }),

  /**
   * Get response time metrics (public)
   */
  responseTime: publicProcedure.query(() => {
    return metrics.getResponseTimeMetrics();
  }),

  /**
   * Get all metrics (public - for unified dashboard)
   */
  getMetrics: publicProcedure.query(() => {
    const report = metrics.getReport();
    return {
      totalRequests: report.totalRequests,
      requestsPerMinute: Math.round(report.requestsPerSecond * 60 * 100) / 100,
      cacheHitRate: report.cache.hitRate,
      cacheHits: report.cache.hits,
      cacheMisses: report.cache.misses,
      avgResponseTime: report.responseTime.avg,
      p95ResponseTime: report.responseTime.p95,
      errorRate: report.errorRate,
      totalErrors: report.errorCount,
      responseTimeDistribution: [
        { range: '0-50ms', count: 0 },
        { range: '50-100ms', count: 0 },
        { range: '100-500ms', count: 0 },
        { range: '500ms+', count: 0 },
      ],
      requestTypes: [
        { type: 'Search', count: report.searchRequests },
        { type: 'Analytics', count: report.analyticsRequests },
      ],
    };
  }),

  /**
   * Get analytics data (public - for unified dashboard)
   */
  getAnalytics: publicProcedure.query(() => {
    const report = metrics.getReport();
    return {
      totalUsers: report.totalRequests,
      activeUsers: Math.max(1, Math.floor(report.totalRequests / 10)),
      topSearch: 'Diabetes',
      topSearchCount: report.searchRequests,
      avgSessionDuration: 120,
      topSearches: [
        { term: 'Diabetes', count: Math.floor(report.searchRequests * 0.3) },
        { term: 'Hypertension', count: Math.floor(report.searchRequests * 0.2) },
        { term: 'Panadol', count: Math.floor(report.searchRequests * 0.15) },
      ],
      hourlyActivity: [
        { hour: '00:00', users: 10 },
        { hour: '06:00', users: 20 },
        { hour: '12:00', users: 50 },
        { hour: '18:00', users: 40 },
      ],
      recentSearches: [
        { term: 'Diabetes', timestamp: new Date() },
        { term: 'Hypertension', timestamp: new Date(Date.now() - 60000) },
      ],
    };
  }),

  /**
   * Reset metrics (admin only)
   */
  reset: adminProcedure.mutation(() => {
    metrics.reset();
    return { success: true, message: "Metrics reset successfully" };
  }),
});
