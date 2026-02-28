import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  getAllMedications,
  getAllCodes,
  getAllNonCoveredCodes,
  searchMedications,
  searchCodes,
  searchNonCoveredCodes,
  getStats,
  getDashboardStats,
  getMedicationById,
  getCodeById,
} from "../db";

const searchQuerySchema = z.object({
  query: z.string()
    .min(1, "Search query cannot be empty")
    .max(200, "Search query is too long")
    .trim()
    .transform((val) => val.replace(/[<>"']/g, "")),
});

export const dataRouter = router({
  // Medications
  medications: router({
    getAll: publicProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await getAllMedications(input?.limit ?? 100, input?.offset ?? 0);
      }),

    search: publicProcedure
      .input(searchQuerySchema.extend({ limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ input }) => {
        return await searchMedications(input.query, input.limit ?? 50, input.offset ?? 0);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getMedicationById(input.id);
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

  // Stats
  stats: publicProcedure.query(async () => {
    return await getStats();
  }),

  // Dashboard stats (protected)
  dashboardStats: protectedProcedure.query(async () => {
    return await getDashboardStats();
  }),
});
