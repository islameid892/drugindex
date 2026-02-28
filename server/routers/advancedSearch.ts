import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { 
  getAllMedications, 
  getMedicationById,
  getAllCodes, 
  getCodeById,
  getCodeByCode,
  getCodesWithBranches,
  getNonCoveredCodes 
} from "../db";

/**
 * Advanced Search Router
 * Provides progressive disclosure search with autocomplete for:
 * 1. Scientific Names
 * 2. Trade Names
 * 3. Indications
 * Returns matching ICD-10 codes with branches
 */

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
      scientificName: z.string().default(""),
      query: z.string().max(100).default(""),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      try {
        const medications = await getAllMedications();
        const lowerQuery = input.query.toLowerCase();

        // Get medications with matching scientific name (if provided)
        const matchedMeds = input.scientificName
          ? medications.filter(med => med.scientificName === input.scientificName)
          : medications;

        // Get trade names for matched medications
        const allTradeNames: string[] = [];
        for (const med of matchedMeds) {
          const fullMed = await getMedicationById(med.id);
          if (fullMed && fullMed.tradeNames) {
            allTradeNames.push(...fullMed.tradeNames);
          }
        }

        // Filter by query and get unique sorted
        const suggestions = getUniqueSorted(
          allTradeNames.filter(name =>
            name.toLowerCase().includes(lowerQuery)
          )
        );

        return suggestions.slice(0, input.limit).map(name => ({
          name,
          count: allTradeNames.filter(t => t === name).length,
        }));
      } catch (error) {
        console.error("Error fetching trade name suggestions:", error);
        return [];
      }
    }),

  /**
   * Step 3: Get indications for selected trade name
   * Returns unique indications for a specific trade name
   */
  indicationSuggestions: publicProcedure
    .input(z.object({
      tradeName: z.string().default(""),
      query: z.string().max(100).default(""),
      limit: z.number().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      try {
        const medications = await getAllMedications();
        const lowerQuery = input.query.toLowerCase();

        // Get medications with matching trade name (if provided)
        let matchedMeds = medications;
        if (input.tradeName) {
          matchedMeds = [];
          for (const med of medications) {
            const fullMed = await getMedicationById(med.id);
            if (fullMed && fullMed.tradeNames && fullMed.tradeNames.includes(input.tradeName)) {
              matchedMeds.push(med);
            }
          }
        }

        // Get indications for matched medications
        const allIndications: string[] = [];
        for (const med of matchedMeds) {
          const fullMed = await getMedicationById(med.id);
          if (fullMed && fullMed.indications) {
            allIndications.push(...fullMed.indications);
          }
        }

        // Filter by query and get unique sorted
        const suggestions = getUniqueSorted(
          allIndications.filter(indication =>
            indication.toLowerCase().includes(lowerQuery)
          )
        );

        return suggestions.slice(0, input.limit).map(indication => ({
          indication,
          count: allIndications.filter(i => i === indication).length,
        }));
      } catch (error) {
        console.error("Error fetching indication suggestions:", error);
        return [];
      }
    }),

  /**
   * Step 4: Get ICD-10 codes for selected indication
   * Returns matching codes with branches and coverage status
   */
  codesByIndication: publicProcedure
    .input(z.object({
      indication: z.string().min(1),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      try {
        const medications = await getAllMedications();
        const nonCoveredCodes = await getNonCoveredCodes();
        const allCodesWithBranches = await getCodesWithBranches();

        // Find medications with matching indication
        const matchedMeds = [];
        for (const med of medications) {
          const fullMed = await getMedicationById(med.id);
          if (fullMed && fullMed.indications && 
              fullMed.indications.some(ind => ind.toLowerCase() === input.indication.toLowerCase())) {
            matchedMeds.push(fullMed);
          }
        }

        // Extract ICD-10 codes from matched medications
        const codeSet = new Set<string>();
        matchedMeds.forEach(med => {
          if (med.icdCodes) {
            med.icdCodes.forEach(code => codeSet.add(code));
          }
        });

        // Get code details with branches
        const results = Array.from(codeSet)
          .map(code => {
            const codeDetail = allCodesWithBranches.find(c => c.code === code);
            const isNonCovered = nonCoveredCodes.some(nc => nc.code === code);
            
            return {
              code,
              description: codeDetail?.description || "",
              isCovered: !isNonCovered,
              branches: codeDetail?.branches || [],
            };
          })
          .slice(0, input.limit);

        return results;
      } catch (error) {
        console.error("Error fetching codes by indication:", error);
        return [];
      }
    }),

  /**
   * Comprehensive search
   * Search across scientific names, trade names, indications, and codes
   */
  comprehensiveSearch: publicProcedure
    .input(z.object({
      query: z.string().min(1).max(200),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      try {
        const medications = await getAllMedications();
        const allCodesWithBranches = await getCodesWithBranches();
        const nonCoveredCodes = await getNonCoveredCodes();
        const lowerQuery = input.query.toLowerCase();

        const results: any = {
          medications: [],
          codes: [],
        };

        // Search medications
        for (const med of medications) {
          const fullMed = await getMedicationById(med.id);
          if (!fullMed) continue;

          const matchScientific = fullMed.scientificName?.toLowerCase().includes(lowerQuery);
          const matchTradeName = fullMed.tradeNames?.some(t => t.toLowerCase().includes(lowerQuery));
          const matchIndication = fullMed.indications?.some(i => i.toLowerCase().includes(lowerQuery));

          if (matchScientific || matchTradeName || matchIndication) {
            results.medications.push({
              id: fullMed.id,
              scientificName: fullMed.scientificName,
              tradeNames: fullMed.tradeNames || [],
              indications: fullMed.indications || [],
              coverageStatus: fullMed.coverageStatus,
              icdCodes: fullMed.icdCodes || [],
            });
          }
        }

        // Search codes
        for (const code of allCodesWithBranches) {
          if (code.code.toLowerCase().includes(lowerQuery) ||
              code.description.toLowerCase().includes(lowerQuery)) {
            const isNonCovered = nonCoveredCodes.some(nc => nc.code === code.code);
            results.codes.push({
              code: code.code,
              description: code.description,
              isCovered: !isNonCovered,
              branches: code.branches || [],
            });
          }
        }

        // Limit results
        results.medications = results.medications.slice(0, input.limit);
        results.codes = results.codes.slice(0, input.limit);

        return results;
      } catch (error) {
        console.error("Error in comprehensive search:", error);
        return { medications: [], codes: [] };
      }
    }),
});
