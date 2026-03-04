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
  getDashboardStats,
  recordSearch,
} from "./db";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  data: dataRouter,
  admin: adminRouter,
  bulk: bulkRouter,
  ocr: ocrRouter,
  tools: toolsRouter,
  advancedSearch: advancedSearchRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  analytics: router({
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
      ] = await Promise.all([
        getTotalSearches(),
        getTotalSearchesSince(7),
        getAverageResponseTime(),
        getActiveUsers(),
        getUniqueSearchers(7),
        getPopularSearches(10),
        getSearchTrend(7),
        getDashboardStats(),
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
        coverage: null,
        todayVolume: 0,
        recentSearches: [],
      };
    }),

    getTotalSearches: publicProcedure.query(async () => getTotalSearches()),
    getAverageResponseTime: publicProcedure.query(async () => getAverageResponseTime()),
    getActiveUsers: publicProcedure.query(async () => getActiveUsers()),
    getPopularSearches: publicProcedure.query(async () => getPopularSearches(10)),
    getSearchTrend: publicProcedure.query(async () => getSearchTrend(7)),
    getDatabaseStats: publicProcedure.query(async () => getDashboardStats()),

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
          searchType: "general",
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
