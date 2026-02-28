import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { advancedSearch, searchMedications, getAllNonCoveredCodes } from "../db";

// Helper to get unique sorted items
function getUniqueSorted(items: string[]): string[] {
  return Array.from(new Set(items))
    .filter((item) => item && item.trim())
    .sort((a, b) => a.localeCompare(b));
}

export const advancedSearchRouter = router({
  /**
   * Step 1: Get scientific name suggestions with autocomplete
   */
  scientificNameSuggestions: publicProcedure
    .input(z.object({ query: z.string().min(1).max(100), limit: z.number().min(1).max(20).default(10) }))
    .query(async ({ input }) => {
      try {
        const results = await searchMedications(input.query, 200, 0);
        const names = getUniqueSorted(results.map((m) => m.scientificName));
        return names.slice(0, input.limit).map((name) => ({
          name,
          count: results.filter((m) => m.scientificName === name).length,
        }));
      } catch (error) {
        console.error("Error fetching scientific name suggestions:", error);
        return [];
      }
    }),

  /**
   * Step 2: Get trade names for selected scientific name
   */
  tradeNameSuggestions: publicProcedure
    .input(z.object({
      scientificName: z.string().default(""),
      query: z.string().max(100).default(""),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      try {
        const results = await advancedSearch({
          scientificName: input.scientificName || undefined,
          limit: 500,
        });
        const lowerQuery = input.query.toLowerCase();
        const allTradeNames: string[] = [];
        results.results.forEach((med) => {
          med.tradeNames.forEach((t) => allTradeNames.push(t));
        });
        const suggestions = getUniqueSorted(
          allTradeNames.filter((name) => name.toLowerCase().includes(lowerQuery))
        );
        return suggestions.slice(0, input.limit).map((name) => ({ name }));
      } catch (error) {
        console.error("Error fetching trade name suggestions:", error);
        return [];
      }
    }),

  /**
   * Step 3: Get indications for selected scientific name and trade names
   */
  indicationsSuggestions: publicProcedure
    .input(z.object({
      scientificName: z.string().default(""),
      tradeNames: z.array(z.string()).default([]),
      query: z.string().max(100).default(""),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      try {
        const results = await advancedSearch({
          scientificName: input.scientificName || undefined,
          tradeName: input.tradeNames.length > 0 ? input.tradeNames[0] : undefined,
          limit: 500,
        });
        const lowerQuery = input.query.toLowerCase();
        const allIndications: string[] = [];
        results.results.forEach((med) => {
          med.indications.forEach((i) => allIndications.push(i));
        });
        const suggestions = getUniqueSorted(
          allIndications.filter((ind) => ind.toLowerCase().includes(lowerQuery))
        );
        return suggestions.slice(0, input.limit).map((indication) => ({ indication }));
      } catch (error) {
        console.error("Error fetching indications suggestions:", error);
        return [];
      }
    }),

  /**
   * Final Search: Get ICD-10 codes for selected filters
   */
  search: publicProcedure
    .input(z.object({
      scientificName: z.string().default(""),
      tradeNames: z.array(z.string()).default([]),
      indications: z.array(z.string()).min(1),
    }))
    .query(async ({ input }) => {
      try {
        const nonCoveredCodesData = await getAllNonCoveredCodes();
        const nonCoveredSet = new Set(nonCoveredCodesData.map((nc) => nc.code));

        const results = await advancedSearch({
          scientificName: input.scientificName || undefined,
          tradeName: input.tradeNames.length > 0 ? input.tradeNames[0] : undefined,
          indication: input.indications.length > 0 ? input.indications[0] : undefined,
          limit: 500,
        });

        // Collect all unique codes from matching medications
        const codeMap = new Map<string, { code: string; description: string; branchCount: number; branches: Array<{ branchCode: string; branchDescription: string }> }>();
        results.results.forEach((med) => {
          med.icdCodes.forEach((c) => {
            if (!codeMap.has(c.code)) {
              codeMap.set(c.code, {
                code: c.code,
                description: c.description,
                branchCount: c.branchCount,
                branches: c.branches ?? [],
              });
            }
          });
        });

        const codes = Array.from(codeMap.values())
          .map((c) => ({
            code: c.code,
            description: c.description,
            isCovered: !nonCoveredSet.has(c.code),
            branches: c.branches.map((b) => ({
              code: b.branchCode,
              description: b.branchDescription,
              isCovered: !nonCoveredSet.has(b.branchCode),
            })),
          }))
          .sort((a, b) => a.code.localeCompare(b.code));

        return { codes };
      } catch (error) {
        console.error("Error searching codes:", error);
        return { codes: [] };
      }
    }),

  /**
   * Get all scientific names (for reference)
   */
  getAllScientificNames: publicProcedure.query(async () => {
    try {
      const results = await advancedSearch({ limit: 2000 });
      const names = getUniqueSorted(results.results.map((m) => m.scientificName));
      return names;
    } catch (error) {
      console.error("Error fetching all scientific names:", error);
      return [];
    }
  }),
});
