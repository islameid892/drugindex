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
  getStatistics,
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
      const stats = await getStatistics();
      // Return basic statistics
      return {
        stats,
        timestamp: new Date(),
      };


    }),

    // Individual endpoints for granular queries
    getTotalSearches: publicProcedure.query(async () => {
      const stats = await getStatistics();
      return { total: stats.medications + stats.conditions + stats.codes };
    }),

    // Track a search event
    trackSearch: publicProcedure
      .input(z.object({
        query: z.string(),
        resultCount: z.number(),
        responseTime: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await recordSearch(
          input.query,
          input.resultCount,
          input.responseTime || 0
        );
      }),
  }),
});

export type AppRouter = typeof appRouter;
