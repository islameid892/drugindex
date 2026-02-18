import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { dataRouter } from "./routers/data";
import { adminRouter } from "./routers/admin";
import { getTotalSearches, getAverageResponseTime, getActiveUsers, getPopularSearches, getCoverageRate, recordSearch } from "./db";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  data: dataRouter,
  admin: adminRouter,
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
      return await getPopularSearches(7);
    }),
    getCoverageRate: publicProcedure.query(async () => {
      return await getCoverageRate();
    }),
    trackSearch: publicProcedure
      .input(z.object({ query: z.string(), resultCount: z.number() }))
      .mutation(async ({ input }) => {
        return await recordSearch({
          query: input.query,
          resultsCount: input.resultCount,
          responseTime: 0,
          timestamp: new Date(),
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
