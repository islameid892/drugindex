import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  advancedSearch,
  getScientificNameSuggestions,
  getTradeNameSuggestions,
  getIndicationSuggestions,
  getAllNonCoveredCodes,
  getDb,
} from "../db";
import { checkCoverageMultiple } from "../coverage";
import { drugEntries } from "../../drizzle/schema";
import { asc } from "drizzle-orm";

export const advancedSearchRouter = router({
  /**
   * Step 1a: Get scientific name suggestions with autocomplete
   */
  scientificNameSuggestions: publicProcedure
    .input(z.object({ query: z.string().min(1).max(100), limit: z.number().min(1).max(20).default(10) }))
    .query(async ({ input }) => {
      return await getScientificNameSuggestions(input.query, input.limit);
    }),

  /**
   * Step 1b: Get trade name suggestions
   */
  tradeNameSuggestions: publicProcedure
    .input(z.object({
      scientificName: z.string().default(""),
      query: z.string().max(100).default(""),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      return await getTradeNameSuggestions(
        input.query,
        input.scientificName || undefined,
        input.limit
      );
    }),

  /**
   * Step 2: Get indications for selected scientific name and/or trade name
   */
  indicationsSuggestions: publicProcedure
    .input(z.object({
      scientificName: z.string().default(""),
      tradeNames: z.array(z.string()).default([]),
      query: z.string().max(100).default(""),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      return await getIndicationSuggestions(
        input.scientificName || undefined,
        input.tradeNames.length > 0 ? input.tradeNames[0] : undefined,
        input.query || undefined,
        input.limit
      );
    }),

  /**
   * Final Search: Get drug entries matching scientific name, trade name, and indications
   * Returns each matching drug entry with its ICD codes, branches, and coverage status
   */
  search: publicProcedure
    .input(z.object({
      scientificName: z.string().default(""),
      tradeNames: z.array(z.string()).default([]),
      indications: z.array(z.string()).default([]),
    }))
    .mutation(async ({ input }) => {
      try {
        // Search for entries matching ALL criteria (scientific name AND indication)
        const { results, total } = await advancedSearch({
          scientificName: input.scientificName || undefined,
          tradeName: input.tradeNames.length > 0 ? input.tradeNames[0] : undefined,
          indication: input.indications.length > 0 ? input.indications[0] : undefined,
          limit: 500,
        });

        // Collect all unique codes to check coverage
        const allCodesToCheck = new Set<string>();
        for (const entry of results) {
          for (const code of entry.icdCodes) {
            allCodesToCheck.add(code.code);
            for (const branch of code.branches) {
              allCodesToCheck.add(branch.branchCode);
            }
          }
        }
        
        // Check coverage for all codes using hierarchical logic
        const coverageMap = await checkCoverageMultiple(Array.from(allCodesToCheck));

        // Format results: each drug entry with its codes and branches
        const drugs = results.map((entry) => ({
          id: entry.id,
          scientificName: entry.scientificName,
          tradeName: entry.tradeName,
          indication: entry.indication,
          coverageStatus: entry.coverageStatus,
          icdCodes: entry.icdCodes.map((c) => ({
            code: c.code,
            description: c.description,
            branchCount: c.branchCount,
            isNonCovered: !coverageMap.get(c.code),
            branches: c.branches.map((b) => ({
              code: b.branchCode,
              description: b.branchDescription,
              isNonCovered: !coverageMap.get(b.branchCode),
            })),
          })),
        }));

        // Collect unique codes across all results
        const codeMap = new Map<string, {
          code: string;
          description: string;
          isNonCovered: boolean;
          branches: Array<{ code: string; description: string; isNonCovered: boolean }>;
        }>();

        for (const drug of drugs) {
          for (const c of drug.icdCodes) {
            if (!codeMap.has(c.code)) {
              codeMap.set(c.code, {
                code: c.code,
                description: c.description,
                isNonCovered: !coverageMap.get(c.code),
                branches: c.branches,
              });
            }
          }
        }

        const codes = Array.from(codeMap.values()).sort((a, b) => a.code.localeCompare(b.code));

        // Build filters summary for the response
        const filters = {
          scientificName: input.scientificName || null,
          tradeNames: input.tradeNames,
          indications: input.indications,
        };

        return { drugs, codes, total, filters };
      } catch (error) {
        console.error("Error in advanced search:", error);
        return { drugs: [], codes: [], total: 0, filters: { scientificName: null, tradeNames: [], indications: [] } };
      }
    }),

  /**
   * Get all unique scientific names (for browsing/autocomplete)
   */
  getAllScientificNames: publicProcedure
    .query(async () => {
      const db = await getDb();
      const rows = await db
        .selectDistinct({ name: drugEntries.scientificName })
        .from(drugEntries);
      // Sort in JS using localeCompare for consistent locale-aware ordering
      return rows
        .map((r: { name: string }) => r.name)
        .sort((a: string, b: string) => a.localeCompare(b));
    }),
});
