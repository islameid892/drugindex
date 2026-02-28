import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { 
  getAllMedications, 
  getAllConditions, 
  getAllCodes, 
  getDb,
  getMedicationById,
} from "../db";
import { 
  medications, 
  medicationTradeNames,
  medicationIndications,
  medicationCodes,
  codes,
  nonCoveredCodes,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return next({ ctx });
});

export const adminRouter = router({
  // Get all medications
  getAllMedications: adminProcedure.query(async () => {
    return await getAllMedications();
  }),

  // Add medication
  addMedication: adminProcedure
    .input(
      z.object({
        scientificName: z.string().min(1),
        tradeNames: z.array(z.string()).optional(),
        indications: z.array(z.string()).optional(),
        icdCodes: z.array(z.string()).optional(),
        coverageStatus: z.enum(["COVERED", "NOT_COVERED", "PARTIAL"]).default("COVERED"),
      })
    )
    .mutation(async ({ input }) => {
      const drizzleInstance = await getDb();
      if (!drizzleInstance) throw new Error("Database connection failed");

      try {
        // Insert medication
        const medResult = await drizzleInstance.insert(medications).values({
          scientificName: input.scientificName,
          coverageStatus: input.coverageStatus,
        });

        const medId = (medResult as any).insertId;

        // Insert trade names
        if (input.tradeNames && input.tradeNames.length > 0) {
          await drizzleInstance.insert(medicationTradeNames).values(
            input.tradeNames.map(name => ({
              medicationId: medId,
              tradeName: name,
            }))
          );
        }

        // Insert indications
        if (input.indications && input.indications.length > 0) {
          await drizzleInstance.insert(medicationIndications).values(
            input.indications.map(indication => ({
              medicationId: medId,
              indication,
            }))
          );
        }

        // Insert medication-code relationships
        if (input.icdCodes && input.icdCodes.length > 0) {
          // Get or create codes
          for (const codeStr of input.icdCodes) {
            const existingCode = await drizzleInstance
              .select()
              .from(codes)
              .where(eq(codes.code, codeStr))
              .limit(1);

            let codeId: number;
            if (existingCode.length > 0) {
              codeId = existingCode[0].id;
            } else {
              const codeResult = await drizzleInstance.insert(codes).values({
                code: codeStr,
                description: "",
              });
              codeId = (codeResult as any).insertId;
            }

            // Link medication to code
            await drizzleInstance.insert(medicationCodes).values({
              medicationId: medId,
              codeId,
            });
          }
        }

        return { success: true, medicationId: medId };
      } catch (error) {
        console.error("Error adding medication:", error);
        throw error;
      }
    }),

  // Update medication
  updateMedication: adminProcedure
    .input(
      z.object({
        id: z.number(),
        scientificName: z.string().optional(),
        tradeNames: z.array(z.string()).optional(),
        indications: z.array(z.string()).optional(),
        icdCodes: z.array(z.string()).optional(),
        coverageStatus: z.enum(["COVERED", "NOT_COVERED", "PARTIAL"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const drizzleInstance = await getDb();
      if (!drizzleInstance) throw new Error("Database connection failed");

      try {
        const { id, ...data } = input;
        const updateData: any = {};

        if (data.scientificName) updateData.scientificName = data.scientificName;
        if (data.coverageStatus) updateData.coverageStatus = data.coverageStatus;

        if (Object.keys(updateData).length > 0) {
          await drizzleInstance.update(medications).set(updateData).where(eq(medications.id, id));
        }

        // Update trade names
        if (data.tradeNames) {
          await drizzleInstance.delete(medicationTradeNames).where(eq(medicationTradeNames.medicationId, id));
          await drizzleInstance.insert(medicationTradeNames).values(
            data.tradeNames.map(name => ({
              medicationId: id,
              tradeName: name,
            }))
          );
        }

        // Update indications
        if (data.indications) {
          await drizzleInstance.delete(medicationIndications).where(eq(medicationIndications.medicationId, id));
          await drizzleInstance.insert(medicationIndications).values(
            data.indications.map(indication => ({
              medicationId: id,
              indication,
            }))
          );
        }

        // Update codes
        if (data.icdCodes) {
          await drizzleInstance.delete(medicationCodes).where(eq(medicationCodes.medicationId, id));
          
          for (const codeStr of data.icdCodes) {
            const existingCode = await drizzleInstance
              .select()
              .from(codes)
              .where(eq(codes.code, codeStr))
              .limit(1);

            let codeId: number;
            if (existingCode.length > 0) {
              codeId = existingCode[0].id;
            } else {
              const codeResult = await drizzleInstance.insert(codes).values({
                code: codeStr,
                description: "",
              });
              codeId = (codeResult as any).insertId;
            }

            await drizzleInstance.insert(medicationCodes).values({
              medicationId: id,
              codeId,
            });
          }
        }

        return { success: true };
      } catch (error) {
        console.error("Error updating medication:", error);
        throw error;
      }
    }),

  // Delete medication
  deleteMedication: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const drizzleInstance = await getDb();
      if (!drizzleInstance) throw new Error("Database connection failed");

      try {
        // Delete related records first
        await drizzleInstance.delete(medicationTradeNames).where(eq(medicationTradeNames.medicationId, input.id));
        await drizzleInstance.delete(medicationIndications).where(eq(medicationIndications.medicationId, input.id));
        await drizzleInstance.delete(medicationCodes).where(eq(medicationCodes.medicationId, input.id));
        
        // Delete medication
        await drizzleInstance.delete(medications).where(eq(medications.id, input.id));

        return { success: true };
      } catch (error) {
        console.error("Error deleting medication:", error);
        throw error;
      }
    }),

  // Get all conditions
  getAllConditions: adminProcedure.query(async () => {
    return await getAllConditions();
  }),

  // Get all codes
  getAllCodes: adminProcedure.query(async () => {
    return await getAllCodes();
  }),

  // Mark code as non-covered
  markCodeAsNonCovered: adminProcedure
    .input(z.object({ code: z.string(), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const drizzleInstance = await getDb();
      if (!drizzleInstance) throw new Error("Database connection failed");

      try {
        const existing = await drizzleInstance
          .select()
          .from(nonCoveredCodes)
          .where(eq(nonCoveredCodes.code, input.code))
          .limit(1);

        if (existing.length === 0) {
          await drizzleInstance.insert(nonCoveredCodes).values({
            code: input.code,
            description: input.description || "",
          });
        }

        return { success: true };
      } catch (error) {
        console.error("Error marking code as non-covered:", error);
        throw error;
      }
    }),

  // Unmark code as non-covered
  unmarkCodeAsNonCovered: adminProcedure
    .input(z.object({ code: z.string() }))
    .mutation(async ({ input }) => {
      const drizzleInstance = await getDb();
      if (!drizzleInstance) throw new Error("Database connection failed");

      try {
        await drizzleInstance.delete(nonCoveredCodes).where(eq(nonCoveredCodes.code, input.code));
        return { success: true };
      } catch (error) {
        console.error("Error unmarking code as non-covered:", error);
        throw error;
      }
    }),
});
