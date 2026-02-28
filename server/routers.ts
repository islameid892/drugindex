import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { dataRouter } from "./routers/data";
import { adminRouter } from "./routers/admin";
import { bulkRouter } from "./routers/bulk";
import { ocrRouter } from "./routers/ocr";
import { toolsRouter } from "./routers/tools";
import { advancedSearchRouter } from "./routers/advancedSearch";
import {
  getTotalSearches,
  getTotalSearchesSince,
  getAverageResponseTime,
  getActiveUsers,
  getUniqueSearchers,
  getPopularSearches,
  getSearchTrend,
  getDatabaseStats,
  getCoverageRate,
  getTodaySearchVolume,
  getRecentSearches,
  recordSearch,
} from "./db";
import { z } from "zod";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  data: dataRouter,
  admin: adminRouter,
  bulk: bulkRouter,
  ocr: ocrRouter,
  tools: toolsRouter,
  advancedSearch: advancedSearchRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  analytics: router({
    // Get full dashboard data in one call
    getDashboard: publicProcedure.query(async () => {
      const [
        totalSearches,
        weekSearches,
        avgResponseTime,
        registeredUsers,
        uniqueSearchers,
        topSearches,
        searchTrend,
        dbStats,
        coverage,
        todayVolume,
        recentSearches,
      ] = await Promise.all([
        getTotalSearches(),
        getTotalSearchesSince(7),
        getAverageResponseTime(),
        getActiveUsers(),
        getUniqueSearchers(7),
        getPopularSearches(10),
        getSearchTrend(7),
        getDatabaseStats(),
        getCoverageRate(),
        getTodaySearchVolume(),
        getRecentSearches(20),
      ]);

      return {
        totalSearches,
        weekSearches,
        avgResponseTime,
        registeredUsers,
        uniqueSearchers,
        topSearches,
        searchTrend,
        dbStats,
        coverage,
        todayVolume,
        recentSearches,
      };
    }),

    // Individual endpoints for granular queries
    getTotalSearches: publicProcedure.query(async () => {
      return await getTotalSearches();
    }),
    getAverageResponseTime: publicProcedure.query(async () => {
      return await getAverageResponseTime();
    }),
    getActiveUsers: publicProcedure.query(async () => {
      return await getActiveUsers();
    }),
    getPopularSearches: publicProcedure.query(async () => {
      return await getPopularSearches(10);
    }),
    getCoverageRate: publicProcedure.query(async () => {
      return await getCoverageRate();
    }),
    getSearchTrend: publicProcedure.query(async () => {
      return await getSearchTrend(7);
    }),
    getDatabaseStats: publicProcedure.query(async () => {
      return await getDatabaseStats();
    }),

    // Track a search event
    trackSearch: publicProcedure
      .input(z.object({
        query: z.string(),
        resultCount: z.number(),
        responseTime: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await recordSearch({
          query: input.query,
          resultsCount: input.resultCount,
          responseTime: input.responseTime || 0,
          timestamp: new Date(),
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
