import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  getAllMedications,
  getAllConditions,
  getAllCodes,
  getNonCoveredCodes,
  searchMedications,
  getStatistics,
  getCodesWithBranches,
} from "../db";

// Input validation schemas with security measures
const searchQuerySchema = z.object({
  query: z.string()
    .min(1, "Search query cannot be empty")
    .max(200, "Search query is too long")
    .trim()
    .transform(val => val.replace(/[<>\"']/g, '')), // Remove potentially dangerous characters
});

export const dataRouter = router({
  // Medications
  medications: router({
    getAll: publicProcedure.query(async () => {
      return await getAllMedications();
    }),

    search: publicProcedure
      .input(searchQuerySchema)
      .query(async ({ input }) => {
        return await searchMedications(input.query);
      }),
  }),

  // Conditions
  conditions: router({
    getAll: publicProcedure.query(async () => {
      return await getAllConditions();
    }),

    search: publicProcedure
      .input(searchQuerySchema)
      .query(async ({ input }) => {
        // Search conditions by name
        const allConditions = await getAllConditions();
        return allConditions.filter(c => 
          c.name.toLowerCase().includes(input.query.toLowerCase())
        );
      }),
  }),

  // Codes
  codes: router({
    getAll: publicProcedure.query(async () => {
      return await getAllCodes();
    }),

    search: publicProcedure
      .input(searchQuerySchema)
      .query(async ({ input }) => {
        // Search codes by code or description
        const allCodes = await getAllCodes();
        return allCodes.filter(c => 
          c.code.toLowerCase().includes(input.query.toLowerCase()) ||
          c.description.toLowerCase().includes(input.query.toLowerCase())
        );
      }),
  }),

  // Non-Covered Codes
  nonCoveredCodes: router({
    getAll: publicProcedure.query(async () => {
      return await getNonCoveredCodes();
    }),

    search: publicProcedure
      .input(searchQuerySchema)
      .query(async ({ input }) => {
        const allCodes = await getNonCoveredCodes();
        return allCodes.filter(c => 
          c.code.toLowerCase().includes(input.query.toLowerCase()) ||
          c.description.toLowerCase().includes(input.query.toLowerCase())
        );
      }),
  }),

  // Admin operations
  admin: router({
    getStats: protectedProcedure.query(async () => {
      // Only allow authenticated users (protectedProcedure ensures this)
      const stats = await getStatistics();

      return {
        medicationsCount: stats.medications,
        conditionsCount: stats.conditions,
        codesCount: stats.codes + stats.branches,
        branchesCount: stats.branches,
      };
    }),
  }),
});
