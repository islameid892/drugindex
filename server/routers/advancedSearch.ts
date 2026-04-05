import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  advancedSearch,
  getScientificNameSuggestions,
  getTradeNameSuggestions,
  getIndicationSuggestions,
  getAllNonCoveredCodes,
} from "../db";

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
      indications: z.array(z.string()).min(1),
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

        // Get non-covered codes for coverage checking
        const nonCoveredData = await getAllNonCoveredCodes();
        const nonCoveredSet = new Set((nonCoveredData as Array<{ code: string }>).map((nc) => nc.code));

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
            isCovered: !nonCoveredSet.has(c.code),
            branches: c.branches.map((b) => ({
              code: b.branchCode,
              description: b.branchDescription,
              isCovered: !nonCoveredSet.has(b.branchCode),
            })),
          })),
        }));

        // Collect unique codes across all results
        const codeMap = new Map<string, {
          code: string;
          description: string;
          isCovered: boolean;
          branches: Array<{ code: string; description: string; isCovered: boolean }>;
        }>();

        for (const drug of drugs) {
          for (const c of drug.icdCodes) {
            if (!codeMap.has(c.code)) {
              codeMap.set(c.code, {
                code: c.code,
                description: c.description,
                isCovered: c.isCovered,
                branches: c.branches,
              });
            }
          }
        }

        const codes = Array.from(codeMap.values()).sort((a, b) => a.code.localeCompare(b.code));

        return { drugs, codes, total };
      } catch (error) {
        console.error("Error in advanced search:", error);
        return { drugs: [], codes: [], total: 0 };
      }
    }),
});
