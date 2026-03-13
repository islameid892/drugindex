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
    const searchMetrics = await getSearchMetrics(24);
    
    const distribution = {
      '0-50ms': 0,
      '50-100ms': 0,
      '100-500ms': 0,
      '500ms+': 0,
    };
    
    // Estimate distribution based on response time metrics
    if (searchMetrics.maxResponseTime > 0) {
      if (searchMetrics.minResponseTime < 50) distribution['0-50ms']++;
      if (searchMetrics.avgResponseTime >= 50 && searchMetrics.avgResponseTime < 100) distribution['50-100ms']++;
      if (searchMetrics.avgResponseTime >= 100 && searchMetrics.avgResponseTime < 500) distribution['100-500ms']++;
      if (searchMetrics.maxResponseTime >= 500) distribution['500ms+']++;
    }
    
    return {
      totalSearches: searchMetrics.totalSearches || 0,
      avgResponseTime: searchMetrics.avgResponseTime || 0,
      minResponseTime: searchMetrics.minResponseTime || 0,
      maxResponseTime: searchMetrics.maxResponseTime || 0,
      responseTimeDistribution: [
        { range: '0-50ms', count: distribution['0-50ms'] },
        { range: '50-100ms', count: distribution['50-100ms'] },
        { range: '100-500ms', count: distribution['100-500ms'] },
        { range: '500ms+', count: distribution['500ms+'] },
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
      activeUsers: activeUsers || 0,
      topSearches: (topSearches || []).map((s: any) => ({
        term: s.query || 'Unknown',
        count: s.count || 0,
        avgResponseTime: s.avgResponseTime || 0,
      })),
      hourlyActivity: (hourlyActivity || []).map((h: any) => ({
        hour: h.hour || 0,
        count: h.count || 0,
        users: h.count || 0,
      })),
      recentSearches: (recentSearches || []).map((s: any) => ({
        term: s.query || 'Unknown',
        timestamp: s.createdAt || new Date(),
        responseTime: s.responseTimeMs || 0,
        resultsCount: s.resultsCount || 0,
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
