import { router, publicProcedure, protectedProcedure, searchProcedure, analyticsProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  searchMedications,
  searchCodes,
  searchNonCoveredCodes,
  getStats,
  getDashboardStats,
  getAllCodes,
  getAllNonCoveredCodes,
  getCodeById,
  getDb,
  browseDrugsByTradeName,
  browseDrugsByTradeNameCount,
  browseConditions,
  browseConditionsCount,
  searchGroupedByScientificName,
} from "../db";
import { searchCache, analyticsCache } from "../cache";
import { drugEntries } from "../../drizzle/schema";

const searchQuerySchema = z.object({
  query: z.string()
    .min(1, "Search query cannot be empty")
    .max(200, "Search query is too long")
    .trim()
    .transform((val) => val.replace(/[<>"']/g, "")),
});

// Add cache stats endpoint for monitoring
const getCacheStats = () => ({
  search: searchCache.getStats(),
  analytics: analyticsCache.getStats(),
});

export const dataRouter = router({
  // Cache stats (for monitoring) - with rate limiting
  cacheStats: analyticsProcedure.query(() => getCacheStats()),

  // Drug search (replaces old medications search)
  medications: router({
    search: searchProcedure
      .input(searchQuerySchema.extend({ limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => {
        return await searchMedications(input.query, input.limit ?? 50, input.offset ?? 0);
      }),

    getAll: publicProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ input }) => {
        const db = await getDb();
        return db.select().from(drugEntries)
          .limit(input?.limit ?? 2000)
          .offset(input?.offset ?? 0);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async () => {
        // Not needed in new schema - return null
        return null;
      }),
  }),

  // Codes
  codes: router({
    getAll: publicProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await getAllCodes(input?.limit ?? 2100, input?.offset ?? 0);
      }),

    search: publicProcedure
      .input(searchQuerySchema)
      .query(async ({ input }) => {
        return await searchCodes(input.query);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getCodeById(input.id);
      }),
  }),

  // Non-Covered Codes
  nonCoveredCodes: router({
    getAll: publicProcedure.query(async () => {
      return await getAllNonCoveredCodes();
    }),

    search: publicProcedure
      .input(searchQuerySchema)
      .query(async ({ input }) => {
        return await searchNonCoveredCodes(input.query);
      }),
  }),

  // Browse: Search Drugs by Trade Name
  browseDrugs: publicProcedure
    .input(z.object({
      query: z.string().min(1).max(200),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const [results, total] = await Promise.all([
        browseDrugsByTradeName(input.query, input.limit ?? 20, input.offset ?? 0),
        browseDrugsByTradeNameCount(input.query),
      ]);
      return { results, total };
    }),

  // Browse: Search Conditions
  browseConditions: publicProcedure
    .input(z.object({
      query: z.string().min(1).max(200),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const [results, total] = await Promise.all([
        browseConditions(input.query, input.limit ?? 20, input.offset ?? 0),
        browseConditionsCount(input.query),
      ]);
      return { results, total };
    }),


  // Main search: grouped by scientific name (with caching and rate limiting)
  searchGrouped: searchProcedure
    .input(z.object({
      query: z.string().min(1).max(200),
      limit: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const startTime = Date.now();
      const cacheKey = `search:${input.query}:${input.limit ?? 30}`;
      
      // Check cache first
      const cached = searchCache.get(cacheKey);
      if (cached) {
        // Log even cache hits
        const responseTimeMs = Date.now() - startTime;
        const { trackSearch } = await import("../db");
        trackSearch({
          query: input.query,
          resultsCount: cached.length,
          responseTimeMs,
          userId: ctx.user?.id || null,
          ipAddress: ctx.req.ip || (ctx.req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown',
        }).catch(err => console.error('Failed to track search:', err));
        return cached;
      }
      
      // If not in cache, fetch from database
      const results = await searchGroupedByScientificName(input.query, input.limit ?? 30);
      const responseTimeMs = Date.now() - startTime;
      
      // Store in cache for future requests
      searchCache.set(cacheKey, results);
      
      // Track search in analytics
      const { trackSearch } = await import("../db");
      trackSearch({
        query: input.query,
        resultsCount: results.length,
        responseTimeMs,
        userId: ctx.user?.id || null,
        ipAddress: ctx.req.ip || (ctx.req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown',
      }).catch(err => console.error('Failed to track search:', err));
      
      return results;
    }),


  // Stats (with caching and rate limiting)
  stats: analyticsProcedure.query(async () => {
    const cacheKey = 'stats:all';
    
    // Check cache first
    const cached = analyticsCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // If not in cache, fetch from database
    const stats = await getStats();
    
    // Store in cache
    analyticsCache.set(cacheKey, stats);
    
    return stats;
  }),


  // Dashboard stats (protected, with caching and rate limiting)
  dashboardStats: protectedProcedure.query(async ({ ctx }) => {
    const cacheKey = 'stats:dashboard';
    
    // Check cache first
    const cached = analyticsCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // If not in cache, fetch from database
    const stats = await getDashboardStats();
    
    // Store in cache
    analyticsCache.set(cacheKey, stats);
    
    return stats;
  }),
});
