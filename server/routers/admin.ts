import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getAllMedications,
  getAllCodes,
  getDashboardStats,
  getDb,
  getMedicationById,
} from "../db";
import {
  medications,
  medicationTradeNames,
  medicationIndications,
  medicationCodes,
  icdCodes,
} from "../../drizzle/schema";
import { eq, inArray } from "drizzle-orm";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return next({ ctx });
});

export const adminRouter = router({
  // Get all medications
  getAllMedications: adminProcedure
    .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
    .query(async ({ input }) => {
      return await getAllMedications(input?.limit ?? 100, input?.offset ?? 0);
    }),

  // Get all codes
  getAllCodes: adminProcedure.query(async () => {
    return await getAllCodes(2100, 0);
  }),

  // Get dashboard stats
  getStats: adminProcedure.query(async () => {
    return await getDashboardStats();
  }),

  // Add medication with normalized structure
  addMedication: adminProcedure
    .input(
      z.object({
        scientificName: z.string().min(1),
        tradeNames: z.array(z.string()).default([]),
        indications: z.array(z.string()).default([]),
        icdCodesList: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Insert medication
      const [medResult] = await db.insert(medications).values({
        scientificName: input.scientificName,
      });
      const medicationId = (medResult as any).insertId as number;

      // Insert trade names
      if (input.tradeNames.length > 0) {
        await db.insert(medicationTradeNames).values(
          input.tradeNames.map((name) => ({ medicationId, tradeName: name }))
        );
      }

      // Insert indications
      if (input.indications.length > 0) {
        await db.insert(medicationIndications).values(
          input.indications.map((ind) => ({ medicationId, indication: ind }))
        );
      }

      // Link ICD codes
      if (input.icdCodesList.length > 0) {
        const codeRows = await db
          .select({ id: icdCodes.id, code: icdCodes.code })
          .from(icdCodes)
          .where(inArray(icdCodes.code, input.icdCodesList));
        if (codeRows.length > 0) {
          await db.insert(medicationCodes).values(
            codeRows.map((c) => ({ medicationId, codeId: c.id }))
          );
        }
      }

      return await getMedicationById(medicationId);
    }),

  // Update medication
  updateMedication: adminProcedure
    .input(
      z.object({
        id: z.number(),
        scientificName: z.string().optional(),
        tradeNames: z.array(z.string()).optional(),
        indications: z.array(z.string()).optional(),
        icdCodesList: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      if (input.scientificName) {
        await db.update(medications)
          .set({ scientificName: input.scientificName })
          .where(eq(medications.id, input.id));
      }

      if (input.tradeNames !== undefined) {
        await db.delete(medicationTradeNames).where(eq(medicationTradeNames.medicationId, input.id));
        if (input.tradeNames.length > 0) {
          await db.insert(medicationTradeNames).values(
            input.tradeNames.map((name) => ({ medicationId: input.id, tradeName: name }))
          );
        }
      }

      if (input.indications !== undefined) {
        await db.delete(medicationIndications).where(eq(medicationIndications.medicationId, input.id));
        if (input.indications.length > 0) {
          await db.insert(medicationIndications).values(
            input.indications.map((ind) => ({ medicationId: input.id, indication: ind }))
          );
        }
      }

      if (input.icdCodesList !== undefined) {
        await db.delete(medicationCodes).where(eq(medicationCodes.medicationId, input.id));
        if (input.icdCodesList.length > 0) {
          const codeRows = await db
            .select({ id: icdCodes.id })
            .from(icdCodes)
            .where(inArray(icdCodes.code, input.icdCodesList));
          if (codeRows.length > 0) {
            await db.insert(medicationCodes).values(
              codeRows.map((c) => ({ medicationId: input.id, codeId: c.id }))
            );
          }
        }
      }

      return await getMedicationById(input.id);
    }),

  // Delete medication
  deleteMedication: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      // Cascade deletes handle related records
      await db.delete(medications).where(eq(medications.id, input.id));
      return { success: true };
    }),
});
