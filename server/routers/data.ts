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

export const dataRouter = router({
  // Medications
  medications: router({
    getAll: publicProcedure.query(async () => {
      return await getAllMedications();
    }),

    search: publicProcedure
      .input(z.object({ query: z.string() }))
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
      .input(z.object({ query: z.string() }))
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
      .input(z.object({ query: z.string() }))
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
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        return await searchNonCoveredCodes(input.query);
      }),
  }),

  // Admin operations
  admin: router({
    getStats: protectedProcedure.query(async () => {
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
