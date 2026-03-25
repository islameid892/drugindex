import { router, adminProcedure, publicProcedure } from "../_core/trpc";
import { metrics } from "../metrics";
import { getSearchMetrics, getRecentSearches, getActiveUsersCount, getTopSearches, getHourlyActivity } from "../db";
import { z } from "zod";

// Time filter options: day=24h, week=168h, month=720h, all=8760h (1 year)
const timeFilterSchema = z.enum(["day", "week", "month", "all"]).default("month");

function getHoursFromFilter(filter: string): number {
  switch (filter) {
    case "day": return 24;
    case "week": return 168;
    case "month": return 720;
    case "all": return 8760;
    default: return 720;
  }
}

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
   * Get all metrics with optional time filter (public)
   */
  getMetrics: publicProcedure
    .input(z.object({ timeFilter: timeFilterSchema }).optional())
    .query(async ({ input }) => {
      try {
        const hoursAgo = getHoursFromFilter(input?.timeFilter ?? "month");
        const searchMetrics = await getSearchMetrics(hoursAgo);

        const distribution = {
          "0-50ms": 0,
          "50-100ms": 0,
          "100-500ms": 0,
          "500ms+": 0,
        };

        if (searchMetrics.maxResponseTime > 0) {
          if (searchMetrics.minResponseTime < 50) distribution["0-50ms"]++;
          if (searchMetrics.avgResponseTime >= 50 && searchMetrics.avgResponseTime < 100) distribution["50-100ms"]++;
          if (searchMetrics.avgResponseTime >= 100 && searchMetrics.avgResponseTime < 500) distribution["100-500ms"]++;
          if (searchMetrics.maxResponseTime >= 500) distribution["500ms+"]++;
        }

        return {
          totalSearches: searchMetrics.totalSearches || 0,
          avgResponseTime: searchMetrics.avgResponseTime || 0,
          minResponseTime: searchMetrics.minResponseTime || 0,
          maxResponseTime: searchMetrics.maxResponseTime || 0,
          timeFilter: input?.timeFilter ?? "month",
          responseTimeDistribution: [
            { range: "0-50ms", count: distribution["0-50ms"] },
            { range: "50-100ms", count: distribution["50-100ms"] },
            { range: "100-500ms", count: distribution["100-500ms"] },
            { range: "500ms+", count: distribution["500ms+"] },
          ],
        };
      } catch (error) {
        console.error("[Monitoring] Error in getMetrics:", error);
        throw error;
      }
    }),

  /**
   * Get analytics data with optional time filter (public)
   */
  getAnalytics: publicProcedure
    .input(z.object({ timeFilter: timeFilterSchema }).optional())
    .query(async ({ input }) => {
      const hoursAgo = getHoursFromFilter(input?.timeFilter ?? "month");

      const [recentSearches, activeUsers, topSearches, hourlyActivity] = await Promise.all([
        getRecentSearches(20),
        getActiveUsersCount(15),
        getTopSearches(5, hoursAgo),
        getHourlyActivity(hoursAgo),
      ]);

      return {
        activeUsers: activeUsers || 0,
        timeFilter: input?.timeFilter ?? "month",
        topSearches: (topSearches || []).map((s: any) => ({
          term: s.query || "Unknown",
          count: s.count || 0,
          avgResponseTime: s.avgResponseTime || 0,
        })),
        hourlyActivity: (hourlyActivity || []).map((h: any) => ({
          hour: h.hour || 0,
          count: h.count || 0,
          users: h.count || 0,
        })),
        recentSearches: (recentSearches || []).map((s: any) => ({
          term: s.query || "Unknown",
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
