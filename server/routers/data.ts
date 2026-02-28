import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  getAllMedications,
  getAllConditions,
  getAllCodes,
  getAllNonCoveredCodes,
  searchMedications,
  searchConditions,
  searchCodes,
  searchNonCoveredCodes,
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
        return await searchConditions(input.query);
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
        return await searchCodes(input.query);
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

  // Admin operations
  admin: router({
    getStats: protectedProcedure.query(async () => {
      // Only allow authenticated users (protectedProcedure ensures this)
      const medications = await getAllMedications();
      const conditions = await getAllConditions();
      const codes = await getAllCodes();
      const nonCoveredCodes = await getAllNonCoveredCodes();

      return {
        medicationsCount: medications.length,
        conditionsCount: conditions.length,
        codesCount: codes.length,
        nonCoveredCodesCount: nonCoveredCodes.length,
      };
    }),
  }),
});
