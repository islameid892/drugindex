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
  getMetrics: publicProcedure.query(async () => {
    const { getSearchMetrics } = await import("../db");
    const metrics = await getSearchMetrics(24);
    
    return {
      totalSearches: metrics.totalSearches,
      avgResponseTime: metrics.avgResponseTime,
      minResponseTime: metrics.minResponseTime,
      maxResponseTime: metrics.maxResponseTime,
      responseTimeDistribution: [
        { range: '0-50ms', count: 0 },
        { range: '50-100ms', count: 0 },
        { range: '100-500ms', count: 0 },
        { range: '500ms+', count: 0 },
      ],
    };
  }),

  /**
   * Get analytics data (public - for unified dashboard)
   */
  getAnalytics: publicProcedure.query(async () => {
    const { getRecentSearches, getActiveUsersCount, getTopSearches, getHourlyActivity } = await import("../db");
    
    const [recentSearches, activeUsers, topSearches, hourlyActivity] = await Promise.all([
      getRecentSearches(20),
      getActiveUsersCount(15),
      getTopSearches(5),
      getHourlyActivity(24),
    ]);

    return {
      activeUsers,
      topSearches: topSearches.map(s => ({
        term: s.query,
        count: s.count,
        avgResponseTime: s.avgResponseTime,
      })),
      hourlyActivity: hourlyActivity.map(h => ({
        hour: h.hour,
        count: h.count,
      })),
      recentSearches: recentSearches.map(s => ({
        term: s.query,
        timestamp: s.createdAt,
        responseTime: s.responseTimeMs,
        resultsCount: s.resultsCount,
      })),
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
