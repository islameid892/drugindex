import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
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
import { icdCodes, nonCoveredCodes } from "../../drizzle/schema";
import { drugEntries } from "../../drizzle/schema";

const searchQuerySchema = z.object({
  query: z.string()
    .min(1, "Search query cannot be empty")
    .max(200, "Search query is too long")
    .trim()
    .transform((val) => val.replace(/[<>"']/g, "")),
});

export const dataRouter = router({
  // Drug search (replaces old medications search)
  medications: router({
    search: publicProcedure
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

  // Browse: Search Codes
  browseCodes: publicProcedure
    .input(z.object({
      query: z.string().min(1).max(200),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      const results = await (db.query as any).icdCodes.findMany({
        where: (codes: any, { like }: any) => like(codes.code, `${input.query}%`),
        limit: input.limit ?? 20,
        offset: input.offset ?? 0,
        with: { branches: true },
      });
      const total = await (db.query as any).icdCodes.findMany({
        where: (codes: any, { like }: any) => like(codes.code, `${input.query}%`),
      }).then((r: any) => r.length);
      return { results: results.map((c: any) => ({
        code: c.code,
        description: c.description,
        branchCount: (c.branches as any)?.length ?? 0,
        branches: c.branches,
        isNonCovered: false,
      })), total };
    }),

  // Browse: Non-Covered Codes
  browseNonCovered: publicProcedure
    .input(z.object({
      query: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      const results = await (db.query as any).nonCoveredCodes.findMany({
        limit: (input as any)?.limit ?? 50,
        offset: (input as any)?.offset ?? 0,
      });
      const total = await (db.query as any).nonCoveredCodes.findMany().then((r: any) => r.length);
      return { results: results.map((c: any) => ({
        code: c.code,
        description: c.description,
      })), total };
    }),

  // Main search: grouped by scientific name
  searchGrouped: publicProcedure
    .input(z.object({
      query: z.string().min(1).max(200),
      limit: z.number().optional(),
    }))
    .query(async ({ input }) => {
      return await searchGroupedByScientificName(input.query, input.limit ?? 30);
    }),

  // Stats
  stats: publicProcedure.query(async () => {
    return await getStats();
  }),

  // Dashboard stats (protected)
  dashboardStats: protectedProcedure.query(async () => {
    return await getDashboardStats();
  }),
});
