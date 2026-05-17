import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { drugLens } from "../../drizzle/schema";
import { sql, like, or, and, eq } from "drizzle-orm";

const ITEMS_PER_PAGE = 20;

export const drugLensRouter = router({
  // Search/list drugs with pagination and filters
  search: publicProcedure
    .input(
      z.object({
        query: z.string().default(""),
        filterBy: z.enum(["trade", "scientific", "both"]).default("both"),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(ITEMS_PER_PAGE),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      const { query, filterBy, page, limit } = input;
      const offset = (page - 1) * limit;

      // Build search condition
      let whereClause: any = undefined;
      if (query.trim()) {
        const searchTerm = `%${query.trim()}%`;
        if (filterBy === "trade") {
          whereClause = like(drugLens.tradeName, searchTerm);
        } else if (filterBy === "scientific") {
          whereClause = like(drugLens.scientificName, searchTerm);
        } else {
          whereClause = or(
            like(drugLens.tradeName, searchTerm),
            like(drugLens.scientificName, searchTerm)
          );
        }
      }

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(drugLens)
        .where(whereClause);
      const total = Number(countResult[0]?.count || 0);

      // Get paginated results
      const results = await db
        .select({
          id: drugLens.id,
          tradeName: drugLens.tradeName,
          scientificName: drugLens.scientificName,
          price: drugLens.price,
          pharmacologicalAction: drugLens.pharmacologicalAction,
          uses: drugLens.uses,
          pregnancyCategory: drugLens.pregnancyCategory,
          standardDose: drugLens.standardDose,
          blackBoxWarning: drugLens.blackBoxWarning,
        })
        .from(drugLens)
        .where(whereClause)
        .orderBy(drugLens.tradeName)
        .limit(limit)
        .offset(offset);

      // Clean price field - remove "SAR" prefix if present
      const cleanedResults = results.map((drug: any) => ({
        ...drug,
        price: drug.price ? drug.price.replace(/^SAR\s*/, "").trim() : drug.price,
      }));

      return {
        results: cleanedResults,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + results.length < total,
      };
    }),

  // Get single drug detail by ID - returns ALL fields
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const results = await db
        .select({
          id: drugLens.id,
          tradeName: drugLens.tradeName,
          scientificName: drugLens.scientificName,
          form: drugLens.form,
          price: drugLens.price,
          imageUrl: drugLens.imageUrl,
          pharmacologicalAction: drugLens.pharmacologicalAction,
          blackBoxWarning: drugLens.blackBoxWarning,
          uses: drugLens.uses,
          pregnancyCategory: drugLens.pregnancyCategory,
          standardDose: drugLens.standardDose,
          adjustedDose: drugLens.adjustedDose,
          neonatalDose: drugLens.neonatalDose,
          doseSource: drugLens.doseSource,
          contraindicatedInteractions: drugLens.contraindicatedInteractions,
          majorInteractions: drugLens.majorInteractions,
          moderateInteractions: drugLens.moderateInteractions,
          minorInteractions: drugLens.minorInteractions,
        })
        .from(drugLens)
        .where(eq(drugLens.id, input.id))
        .limit(1);
      const drug = (results[0] ?? null) as any;
      if (drug && drug.price) {
        drug.price = drug.price.replace(/^SAR\s*/, "").trim();
      }
      return drug;
    }),

  // Autocomplete suggestions
  autocomplete: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        filterBy: z.enum(["trade", "scientific", "both"]).default("both"),
        limit: z.number().min(1).max(20).default(8),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      const { query, filterBy, limit } = input;
      // NOTE: Price cleaning will be done here too if autocomplete returns prices
      const searchTerm = `%${query.trim()}%`;

      let whereClause: any;
      if (filterBy === "trade") {
        whereClause = like(drugLens.tradeName, searchTerm);
      } else if (filterBy === "scientific") {
        whereClause = like(drugLens.scientificName, searchTerm);
      } else {
        whereClause = or(
          like(drugLens.tradeName, searchTerm),
          like(drugLens.scientificName, searchTerm)
        );
      }

      const results = await db
        .select({
          id: drugLens.id,
          tradeName: drugLens.tradeName,
          scientificName: drugLens.scientificName,
        })
        .from(drugLens)
        .where(whereClause)
        .orderBy(drugLens.tradeName)
        .limit(limit);

      return results;
    }),

  // Get alternatives by scientific name (same active ingredient)
  getAlternatives: publicProcedure
    .input(z.object({ scientificName: z.string(), form: z.string().optional(), excludeId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      let whereCondition: any;
      if (input.form && input.form.trim()) {
        // Exact form match to avoid mixing tablet with film-coated tablet etc.
        whereCondition = and(
          eq(drugLens.scientificName, input.scientificName),
          eq(drugLens.form, input.form),
          sql`${drugLens.id} != ${input.excludeId}`
        );
      } else {
        whereCondition = and(
          eq(drugLens.scientificName, input.scientificName),
          sql`${drugLens.id} != ${input.excludeId}`
        );
      }
      
      const results = await db
        .select({
          id: drugLens.id,
          tradeName: drugLens.tradeName,
          scientificName: drugLens.scientificName,
          form: drugLens.form,
          price: drugLens.price,
          standardDose: drugLens.standardDose,
        })
        .from(drugLens)
        .where(whereCondition)
        .orderBy(drugLens.tradeName)
        .limit(50);
      return results;
    }),

  // Get total count for stats
  getStats: publicProcedure.query(async () => {
    const db = await getDb();
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(drugLens);
    return { total: Number(result[0]?.count || 0) };
  }),
});
