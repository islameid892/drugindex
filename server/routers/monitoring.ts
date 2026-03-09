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
   * Reset metrics (admin only)
   */
  reset: adminProcedure.mutation(() => {
    metrics.reset();
    return { success: true, message: "Metrics reset successfully" };
  }),
});
