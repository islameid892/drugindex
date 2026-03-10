import { router, adminProcedure, publicProcedure } from "../_core/trpc";
import { advancedCache } from "../advancedCache";
import { z } from "zod";

export const advancedCachingRouter = router({
  /**
   * Get cache statistics (public)
   */
  stats: publicProcedure.query(async () => {
    return await advancedCache.getStats();
  }),

  /**
   * Warm cache with popular searches (admin only)
   */
  warmCache: adminProcedure
    .input(
      z.array(
        z.object({
          query: z.string(),
          data: z.any(),
        })
      )
    )
    .mutation(async ({ input }) => {
      const count = await advancedCache.warmCache(input);
      return { success: true, warmed: count };
    }),

  /**
   * Invalidate cache by pattern (admin only)
   */
  invalidatePattern: adminProcedure
    .input(z.object({ pattern: z.string() }))
    .mutation(async ({ input }) => {
      const deleted = await advancedCache.invalidateByPattern(input.pattern);
      return { success: true, deleted };
    }),

  /**
   * Clear all expired entries (admin only)
   */
  clearExpired: adminProcedure.mutation(async () => {
    const deleted = await advancedCache.clearExpired();
    return { success: true, deleted };
  }),

  /**
   * Clear all cache (admin only)
   */
  clearAll: adminProcedure.mutation(async () => {
    await advancedCache.clear();
    return { success: true, message: "All cache cleared" };
  }),

  /**
   * Get cache keys (admin only)
   */
  getKeys: adminProcedure.query(async () => {
    return await advancedCache.getKeys();
  }),
});
