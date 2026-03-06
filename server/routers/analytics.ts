import { protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

export const analyticsRouter = {
  // Get all analytics data
  getAnalytics: protectedProcedure.query(async ({ ctx }) => {
    // Only admins can access analytics
    if (ctx.user?.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    try {
      const database = await getDb();

      // 1. Total Searches (all time, this week, today)
      const totalSearchesResult = await database.execute(
        sql`SELECT COUNT(*) as count FROM searches`
      );
      const totalSearches = (totalSearchesResult as any)[0]?.count || 0;

      const weekSearchesResult = await database.execute(
        sql`SELECT COUNT(*) as count FROM searches WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
      );
      const searchesThisWeek = (weekSearchesResult as any)[0]?.count || 0;

      const todaySearchesResult = await database.execute(
        sql`SELECT COUNT(*) as count FROM searches WHERE DATE(created_at) = CURDATE()`
      );
      const searchesToday = (todaySearchesResult as any)[0]?.count || 0;

      // 2. Registered Users
      const usersResult = await database.execute(
        sql`SELECT COUNT(*) as count FROM users`
      );
      const registeredUsers = (usersResult as any)[0]?.count || 0;

      // 3. Average Response Time
      const avgResponseResult = await database.execute(
        sql`SELECT AVG(response_time_ms) as avg_time FROM search_logs ORDER BY id DESC LIMIT 100`
      );
      const avgResponseTime = Math.round((avgResponseResult as any)[0]?.avg_time || 0);

      // 4. Coverage Rate
      const coverageResult = await database.execute(
        sql`SELECT 
          COUNT(CASE WHEN has_results = 1 THEN 1 END) as covered,
          COUNT(*) as total
        FROM searches`
      );
      const coverageData = (coverageResult as any)[0];
      const coveredCount = coverageData?.covered || 0;
      const totalCount = coverageData?.total || 1;
      const coverageRate = totalCount > 0 ? Math.round((coveredCount / totalCount) * 100) : 0;

      // 5. Weekly Trends
      const weeklyTrendsResult = await database.execute(
        sql`SELECT DATE(created_at) as date, COUNT(*) as count
          FROM searches
          WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
          GROUP BY DATE(created_at)
          ORDER BY date ASC`
      );
      const weeklyTrends = (weeklyTrendsResult as any).map((row: any) => ({
        date: row.date,
        count: row.count,
      }));

      // 6. Top Searches
      const topSearchesResult = await database.execute(
        sql`SELECT search_term, COUNT(*) as count
          FROM searches
          GROUP BY search_term
          ORDER BY count DESC
          LIMIT 10`
      );
      const topSearches = (topSearchesResult as any).map((row: any) => ({
        term: row.search_term,
        count: row.count,
      }));

      // 7. Recent Searches
      const recentSearchesResult = await database.execute(
        sql`SELECT search_term, created_at, has_results
          FROM searches
          ORDER BY created_at DESC
          LIMIT 20`
      );
      const recentSearches = (recentSearchesResult as any).map((row: any) => ({
        term: row.search_term,
        createdAt: row.created_at,
        hasResults: row.has_results === 1,
      }));

      // 8. Database Summary
      const icd10Result = await database.execute(
        sql`SELECT COUNT(*) as count FROM icd10_codes`
      );
      const icd10Count = (icd10Result as any)[0]?.count || 0;

      const medicationsResult = await database.execute(
        sql`SELECT COUNT(*) as count FROM medications`
      );
      const medicationsCount = (medicationsResult as any)[0]?.count || 0;

      const conditionsResult = await database.execute(
        sql`SELECT COUNT(*) as count FROM conditions`
      );
      const conditionsCount = (conditionsResult as any)[0]?.count || 0;

      return {
        totalSearches,
        searchesToday,
        searchesThisWeek,
        registeredUsers,
        avgResponseTime,
        coverageRate,
        coveredCount,
        totalCount,
        weeklyTrends,
        topSearches,
        recentSearches,
        dbSummary: {
          icd10Count,
          medicationsCount,
          conditionsCount,
          coverageRate,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Analytics query error:", error);
      throw new Error("Failed to fetch analytics data");
    }
  }),
};
