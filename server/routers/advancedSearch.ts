import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getAllMedications, getAllCodes } from "../db";

/**
 * Advanced Search Router
 * Provides progressive disclosure search with autocomplete for:
 * 1. Scientific Names
 * 2. Trade Names
 * 3. Indications
 * Returns matching ICD-10 codes with branches
 */

// Helper to parse JSON arrays from database
function parseJsonArray(jsonString: string | null): string[] {
  if (!jsonString) return [];
  try {
    return JSON.parse(jsonString);
  } catch {
    return [];
  }
}

// Helper to get unique sorted items
function getUniqueSorted(items: string[]): string[] {
  return Array.from(new Set(items))
    .filter(item => item && item.trim())
    .sort((a, b) => a.localeCompare(b));
}

export const advancedSearchRouter = router({
  /**
   * Step 1: Get scientific name suggestions with autocomplete
   * Returns unique scientific names matching the query
   */
  scientificNameSuggestions: publicProcedure
    .input(z.object({
      query: z.string().min(1).max(100),
      limit: z.number().min(1).max(20).default(10),
    }))
    .query(async ({ input }) => {
      try {
        const medications = await getAllMedications();
        const lowerQuery = input.query.toLowerCase();

        // Get unique scientific names matching query
        const suggestions = getUniqueSorted(
          medications
            .filter(med => {
              const scientificName = med.scientificName?.toLowerCase() || "";
              return scientificName.includes(lowerQuery);
            })
            .map(med => med.scientificName)
        );

        return suggestions.slice(0, input.limit).map(name => ({
          name,
          count: medications.filter(m => m.scientificName === name).length,
        }));
      } catch (error) {
        console.error("Error fetching scientific name suggestions:", error);
        return [];
      }
    }),

  /**
   * Step 2: Get trade names for selected scientific name
   * Returns unique trade names for a specific scientific name
   */
  tradeNameSuggestions: publicProcedure
    .input(z.object({
      scientificName: z.string().min(1),
      query: z.string().max(100).default(""),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      try {
        const medications = await getAllMedications();
        const lowerQuery = input.query.toLowerCase();

        // Get medications with matching scientific name
        const matchedMeds = medications.filter(
          med => med.scientificName === input.scientificName
        );

        // Extract and parse trade names
        const allTradeNames: string[] = [];
        matchedMeds.forEach(med => {
          const tradeNames = parseJsonArray(med.tradeNames);
          allTradeNames.push(...tradeNames);
        });

        // Filter by query and get unique sorted
        const suggestions = getUniqueSorted(
          allTradeNames.filter(name =>
            name.toLowerCase().includes(lowerQuery)
          )
        );

        return suggestions.slice(0, input.limit).map(name => ({
          name,
        }));
      } catch (error) {
        console.error("Error fetching trade name suggestions:", error);
        return [];
      }
    }),

  /**
   * Step 3: Get indications for selected scientific name and trade names
   * Returns unique indications sorted alphabetically
   */
  indicationsSuggestions: publicProcedure
    .input(z.object({
      scientificName: z.string().min(1),
      tradeNames: z.array(z.string()).default([]),
      query: z.string().max(100).default(""),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      try {
        const medications = await getAllMedications();
        const lowerQuery = input.query.toLowerCase();

        // Get medications matching scientific name and optionally trade names
        let matchedMeds = medications.filter(
          med => med.scientificName === input.scientificName
        );

        // If trade names are selected, filter further
        if (input.tradeNames.length > 0) {
          matchedMeds = matchedMeds.filter(med => {
            const tradeNames = parseJsonArray(med.tradeNames);
            return input.tradeNames.some(selected =>
              tradeNames.includes(selected)
            );
          });
        }

        // Extract unique indications
        const allIndications = matchedMeds
          .map(med => med.indication)
          .filter((indication): indication is string => !!indication);

        // Filter by query and get unique sorted
        const suggestions = getUniqueSorted(
          allIndications.filter(indication =>
            indication.toLowerCase().includes(lowerQuery)
          )
        );

        return suggestions.slice(0, input.limit).map(indication => ({
          indication,
        }));
      } catch (error) {
        console.error("Error fetching indications suggestions:", error);
        return [];
      }
    }),

  /**
   * Final Search: Get ICD-10 codes for selected filters
   * Returns codes with their branches and related information
   */
  search: publicProcedure
    .input(z.object({
      scientificName: z.string().min(1),
      tradeNames: z.array(z.string()).default([]),
      indications: z.array(z.string()).default([]),
    }))
    .query(async ({ input }) => {
      try {
        const medications = await getAllMedications();
        const allCodes = await getAllCodes();

        // Filter medications based on all criteria
        let matchedMeds = medications.filter(
          med => med.scientificName === input.scientificName
        );

        // Filter by trade names if provided
        if (input.tradeNames.length > 0) {
          matchedMeds = matchedMeds.filter(med => {
            const tradeNames = parseJsonArray(med.tradeNames);
            return input.tradeNames.some(selected =>
              tradeNames.includes(selected)
            );
          });
        }

        // Filter by indications if provided
        if (input.indications.length > 0) {
          matchedMeds = matchedMeds.filter(med =>
            input.indications.includes(med.indication || "")
          );
        }

        // Extract all ICD-10 codes from matched medications
        const codeSet = new Set<string>();
        matchedMeds.forEach(med => {
          const codes = parseJsonArray(med.icdCodes);
          codes.forEach(code => codeSet.add(code));
        });

        // Get code details from database
        const results = Array.from(codeSet)
          .map(code => {
            const codeData = allCodes.find(c => c.code === code);
            if (!codeData) return null;

            const branches = parseJsonArray(codeData.branches);
            return {
              code: codeData.code,
              description: codeData.description,
              branches: branches.map(branch => ({
                code: branch,
                description: allCodes.find(c => c.code === branch)?.description || "",
              })),
              relatedMedications: parseJsonArray(codeData.relatedMedications),
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null)
          .sort((a, b) => a.code.localeCompare(b.code));

        return {
          total: results.length,
          codes: results,
          filters: {
            scientificName: input.scientificName,
            tradeNames: input.tradeNames,
            indications: input.indications,
          },
        };
      } catch (error) {
        console.error("Error performing advanced search:", error);
        return {
          total: 0,
          codes: [],
          filters: input,
        };
      }
    }),

  /**
   * Get all unique scientific names (for initial dropdown)
   */
  getAllScientificNames: publicProcedure.query(async () => {
    try {
      const medications = await getAllMedications();
      const names = getUniqueSorted(
        medications.map(med => med.scientificName)
      );
      return names;
    } catch (error) {
      console.error("Error fetching all scientific names:", error);
      return [];
    }
  }),
});
