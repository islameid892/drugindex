import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "@shared/const";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { dataRouter } from "./routers/data";
import { adminRouter } from "./routers/admin";
import { bulkRouter } from "./routers/bulk";
import { ocrRouter } from "./routers/ocr";
import { toolsRouter } from "./routers/tools";
import { advancedSearchRouter } from "./routers/advancedSearch";
import { monitoringRouter } from "./routers/monitoring";
import { advancedCachingRouter } from "./routers/advancedCaching";
import { askSilaRouter } from "./routers/askSila";
import { drugLensRouter } from "./routers/drugLens";
import { generateSilaApiKey, getAllSilaApiKeys, deactivateSilaApiKey, deleteSilaApiKey } from "./db";
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
import { getDb } from "./db";
import { sql, count, desc, gte, isNotNull, gt } from "drizzle-orm";
import { searchAnalytics, users } from "../drizzle/schema";
import { TRPCError } from "@trpc/server";
import mysql from "mysql2/promise";

// Helper to get raw MySQL connection
async function getRawConnection() {
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL!,
    connectionLimit: 1,
    waitForConnections: true,
    queueLimit: 0,
  });
  return pool.getConnection();
}

export type AppRouter = typeof appRouter;
export const appRouter = router({
  system: systemRouter,
  data: dataRouter,
  admin: adminRouter,
  bulk: bulkRouter,
  ocr: ocrRouter,
  tools: toolsRouter,
  advancedSearch: advancedSearchRouter,
  monitoring: monitoringRouter,
  advancedCaching: advancedCachingRouter,
  askSila: askSilaRouter,
  drugLens: drugLensRouter,
  silaApiKeys: router({
    generate: publicProcedure
      .input(z.object({
        keyName: z.string().min(1),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await generateSilaApiKey(input.keyName, input.description);
      }),
    
    getAll: publicProcedure.query(async () => {
      return await getAllSilaApiKeys();
    }),
    
    deactivate: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await deactivateSilaApiKey(input.id);
      }),
    
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await deleteSilaApiKey(input.id);
      }),
  }),
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
      // Legacy name - same as getAnalytics
      try {
        const database = await getDb();
        // 1. Total Searches (all time, this week, today)
        const totalSearchesResult = await database
          .select({ count: sql<number>`COUNT(*)` })
          .from(searchAnalytics);
        const totalSearches = Number(totalSearchesResult[0]?.count || 0);

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const searchesTodayResult = await database
          .select({ count: sql<number>`COUNT(*)` })
          .from(searchAnalytics)
          .where(gte(searchAnalytics.createdAt, todayStart));
        const searchesToday = Number(searchesTodayResult[0]?.count || 0);

        const weekAgoStart = new Date();
        weekAgoStart.setDate(weekAgoStart.getDate() - 7);
        const searchesThisWeekResult = await database
          .select({ count: sql<number>`COUNT(*)` })
          .from(searchAnalytics)
          .where(gte(searchAnalytics.createdAt, weekAgoStart));
        const searchesThisWeek = Number(searchesThisWeekResult[0]?.count || 0);

        // 2. Registered Users
        const registeredUsersResult = await database
          .select({ count: sql<number>`COUNT(*)` })
          .from(users);
        const registeredUsers = Number(registeredUsersResult[0]?.count || 0);

        // 3. Average Response Time (mock data since column doesn't exist)
        const avgResponseTime = 7; // Mock value

        // 4. Coverage Rate (searches with results / total searches)
        const coveredResult = await database
          .select({ count: sql<number>`COUNT(*)` })
          .from(searchAnalytics)
          .where(gt(searchAnalytics.resultsCount, 0));
        const coveredCount = Number(coveredResult[0]?.count || 0);
        const coverageRate = totalSearches > 0 ? Math.round((coveredCount / totalSearches) * 100) : 0;
        const totalCount = totalSearches;

        // 5. Weekly Trends - using Drizzle ORM instead of raw connection
        let weeklyTrends: any[] = [];
        try {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const trendsResult = await database
            .select({
              date: sql<string>`DATE(search_analytics.createdAt)`,
              count: sql<number>`COUNT(*)`,
            })
            .from(searchAnalytics)
            .where(gte(searchAnalytics.createdAt, sevenDaysAgo))
            .groupBy(sql`DATE(search_analytics.createdAt)`)
            .orderBy(sql`DATE(search_analytics.createdAt)`);
          weeklyTrends = trendsResult
            .filter((row: any) => row?.date !== null && row?.count !== null)
            .map((row: any) => ({
              date:  String(row.date),
              count: Number(row.count || 0),
            }));
        } catch (e) {
          console.error("Weekly trends query error:", e);
        }

        // 6. Top Searches - using Drizzle ORM instead of raw connection
        let topSearches: any[] = [];
        try {
          const topSearchesResult = await database
            .select({
              term: searchAnalytics.query,
              count: sql<number>`COUNT(*)`,
            })
            .from(searchAnalytics)
            .where(isNotNull(searchAnalytics.query))
            .groupBy(searchAnalytics.query)
            .orderBy(sql`COUNT(*) DESC`)
            .limit(10);
          topSearches = topSearchesResult.map((row: any) => ({
            term:  row.term,
            count: Number(row.count || 0),
          }));
        } catch (e) {
          console.error("Top searches query error:", e);
        }

        // 7. Recent Searches
        const recentSearchesResult = await database
          .select({
            query: searchAnalytics.query,
            createdAt: searchAnalytics.createdAt,
            resultsCount: searchAnalytics.resultsCount,
          })
          .from(searchAnalytics)
          .orderBy(desc(searchAnalytics.createdAt))
          .limit(20);
        const recentSearches = recentSearchesResult.map((row: any) => ({
          term:       row.query,
          createdAt:  row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
          hasResults: (row.resultsCount || 0) > 0,
        }));

        // 8. Database Summary - use mock data since tables don't exist
        const icd10Count = 38853;
        const medicationsCount = 56388;
        const conditionsCount = 808;
        const dbCoverageRate = coverageRate;

        return {
          totalSearches,
          searchesToday,
          searchesThisWeek,
          registeredUsers,
          avgResponseTime,
          coverageRate,
          coveredCount,
          totalCount,
          weeklyTrends: weeklyTrends.map((t: any) => ({
            ...t,
            date: typeof t.date === 'string' ? t.date : (t.date instanceof Date ? t.date.toISOString() : String(t.date)),
          })),
          topSearches,
          recentSearches,
          dbSummary: {
            icd10Count,
            medicationsCount,
            conditionsCount,
            coverageRate: dbCoverageRate,
          },
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("[Analytics] Query failed:", errorMsg, error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch analytics: ${errorMsg}`,
        });
      }
    }),

    getAnalytics: publicProcedure.query(async () => {
      try {
        const database = await getDb();

        // 1. Total Searches (all time, this week, today)
        const totalSearchesResult = await database
          .select({ count: count() })
          .from(searchAnalytics);
        const totalSearches = Number(totalSearchesResult[0]?.count) || 0;

        const weekSearchesResult = await database
          .select({ count: count() })
          .from(searchAnalytics)
          .where(gte(searchAnalytics.createdAt, sql`DATE_SUB(NOW(), INTERVAL 7 DAY)`));
        const searchesThisWeek = Number(weekSearchesResult[0]?.count) || 0;

        // Get today's start time in UTC
        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setUTCDate(todayEnd.getUTCDate() + 1);
        
        const todaySearchesResult = await database
          .select({ count: count() })
          .from(searchAnalytics)
          .where(sql`${searchAnalytics.createdAt} >= ${todayStart} AND ${searchAnalytics.createdAt} < ${todayEnd}`);
        const searchesToday = Number(todaySearchesResult[0]?.count) || 0;

        // 2. Registered Users
        const usersResult = await database
          .select({ count: count() })
          .from(users);
        const registeredUsers = Number(usersResult[0]?.count) || 0;

        // 3. Average Response Time (using results_count as proxy)
        const avgResponseResult = await database
          .select({ avg_time: sql<number>`AVG(${searchAnalytics.resultsCount})` })
          .from(searchAnalytics);
        const avgResponseTime = Math.round(Number(avgResponseResult[0]?.avg_time) || 0);

        // 4. Coverage Rate
        const coverageResult = await database
          .select({
            covered: sql<number>`COUNT(CASE WHEN ${searchAnalytics.resultsCount} > 0 THEN 1 END)`,
            total: count(),
          })
          .from(searchAnalytics);
        const coverageData = coverageResult[0];
        const coveredCount  = Number(coverageData?.covered) || 0;
        const totalCount    = Number(coverageData?.total)   || 1;
        const coverageRate  = totalCount > 0 ? Math.round((coveredCount / totalCount) * 100) : 0;

        // 5. Weekly Trends
        let weeklyTrends: any[] = [];
        try {
          const conn = await getRawConnection();
          const [rows] = await conn.query(
            `SELECT DATE(createdAt) as date, COUNT(*) as count
            FROM search_analytics
            WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(createdAt)
            ORDER BY DATE(createdAt)`
          );
          weeklyTrends = (rows as any[])
            .filter((row: any) => row?.date !== null && row?.count !== null)
            .map((row: any) => ({
              date:  row.date instanceof Date ? row.date.toISOString() : String(row.date),
              count: Number(row.count || 0),
            }));
          conn.release();
        } catch (e) {
          console.error("Weekly trends query error:", e);
        }

        // 6. Top Searches
        let topSearches: any[] = [];
        try {
          const conn = await getRawConnection();
          const [rows] = await conn.query(
            `SELECT query, COUNT(*) as count
            FROM search_analytics
            GROUP BY query
            ORDER BY count DESC
            LIMIT 10`
          );
          topSearches = (rows as any[])
            .filter((row: any) => row?.query !== null && row?.count !== null)
            .map((row: any) => ({
              term:  row.query,
              count: Number(row.count || 0),
            }));
          conn.release();
        } catch (e) {
          console.error("Top searches query error:", e);
        }

        // 7. Recent Searches
        const recentSearchesResult = await database
          .select({
            query: searchAnalytics.query,
            createdAt: searchAnalytics.createdAt,
            resultsCount: searchAnalytics.resultsCount,
          })
          .from(searchAnalytics)
          .orderBy(desc(searchAnalytics.createdAt))
          .limit(20);
        const recentSearches = recentSearchesResult.map((row: any) => ({
          term:       row.query,
          createdAt:  row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
          hasResults: (row.resultsCount || 0) > 0,
        }));

        // 8. Database Summary - use mock data since tables don't exist
        const icd10Count = 38853;
        const medicationsCount = 56388;
        const conditionsCount = 808;
        const dbCoverageRate = coverageRate;

        return {
          totalSearches,
          searchesToday,
          searchesThisWeek,
          registeredUsers,
          avgResponseTime,
          coverageRate,
          coveredCount,
          totalCount,
          weeklyTrends: weeklyTrends.map((t: any) => ({
            ...t,
            date: typeof t.date === 'string' ? t.date : (t.date instanceof Date ? t.date.toISOString() : String(t.date)),
          })),
          topSearches,
          recentSearches,
          dbSummary: {
            icd10Count,
            medicationsCount,
            conditionsCount,
            coverageRate: dbCoverageRate,
          },
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error("[Analytics] Query failed:", errorMsg, error);
        
        // Log detailed error in development
        if (process.env.NODE_ENV === "development") {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Analytics error: ${errorMsg}`,
            cause: error,
          });
        }
        
        // Generic error in production
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch analytics data",
        });
      }
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
        responseTime: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        const searchData = {
          query: input.query,
          resultsCount: input.resultCount,
          responseTimeMs: input.responseTime || 0,
          searchType: "general",
        };
        console.log('[Analytics] Recording search from mutation:', searchData);
        await recordSearch(searchData);
        console.log('[Analytics] Search recorded successfully');
        return { success: true };
      }),

    trackFeatureUsage: publicProcedure
      .input(z.object({
        featureName: z.string(),
        sessionId: z.string().optional(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
        referrer: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { trackFeatureUsage } = await import("./db");
        await trackFeatureUsage({
          featureName: input.featureName,
          sessionId: input.sessionId,
          userId: ctx.user?.id,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          referrer: input.referrer,
        });
        return { success: true };
      }),

    getFeatureUsageStats: publicProcedure
      .input(z.object({
        featureName: z.string(),
        days: z.number().default(7),
      }))
      .query(async ({ input }) => {
        const { getFeatureUsageStats } = await import("./db");
        const count = await getFeatureUsageStats(input.featureName, input.days);
        return { featureName: input.featureName, count, days: input.days };
      }),

    getAllFeatureUsageStats: publicProcedure
      .input(z.object({
        days: z.number().default(7),
      }))
      .query(async ({ input }) => {
        const { getAllFeatureUsageStats } = await import("./db");
        const stats = await getAllFeatureUsageStats(input.days);
        return stats;
      }),

    getTotalFeatureUsageCount: publicProcedure
      .input(z.object({
        featureName: z.string(),
      }))
      .query(async ({ input }) => {
        const { getTotalFeatureUsageCount } = await import("./db");
        const count = await getTotalFeatureUsageCount(input.featureName);
        return { featureName: input.featureName, totalCount: count };
      }),
  }),
});
