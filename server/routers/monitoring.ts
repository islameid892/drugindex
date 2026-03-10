import { router, adminProcedure, publicProcedure } from "../_core/trpc";
import { metrics } from "../metrics";
import { liveAnalytics } from "../liveAnalytics";

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
   * Get LIVE analytics data (public - for unified dashboard)
   * Shows real searches happening RIGHT NOW
   */
  getAnalytics: publicProcedure.query(async () => {
    try {
      // Get live snapshot (in-memory, real-time)
      const liveSnapshot = liveAnalytics.getSnapshot();

      // Also fetch historical data from database
      const dbAnalytics = await liveAnalytics.getDatabaseAnalytics(24);

      // Merge live and database data
      const topSearches = liveSnapshot.topSearches.length > 0 
        ? liveSnapshot.topSearches 
        : dbAnalytics.topSearches;

      const recentSearches = liveSnapshot.recentSearches.length > 0
        ? liveSnapshot.recentSearches
        : dbAnalytics.recentSearches;

      const totalSearches = liveSnapshot.totalSearches > 0
        ? liveSnapshot.totalSearches
        : dbAnalytics.totalSearches;

      return {
        totalUsers: totalSearches,
        activeUsers: Math.max(1, Math.floor(totalSearches / 10)),
        topSearch: topSearches[0]?.term || 'N/A',
        topSearchCount: topSearches[0]?.count || 0,
        avgSessionDuration: 120,
        topSearches: topSearches.slice(0, 5),
        hourlyActivity: liveSnapshot.hourlyActivity,
        recentSearches: recentSearches.map((s: any) => ({
          term: s.query || s.term,
          timestamp: s.timestamp,
          results: s.count || s.resultsCount,
        })),
      };
    } catch (error) {
      console.error("Error fetching analytics:", error);
      return {
        totalUsers: 0,
        activeUsers: 0,
        topSearch: 'N/A',
        topSearchCount: 0,
        avgSessionDuration: 0,
        topSearches: [],
        hourlyActivity: [],
        recentSearches: [],
      };
    }
  }),

  /**
   * Reset metrics (admin only)
   */
  reset: adminProcedure.mutation(() => {
    metrics.reset();
    liveAnalytics.reset();
    return { success: true, message: "Metrics and analytics reset successfully" };
  }),
});
