import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getAllMedications, getAllConditions, getAllCodes, getDb } from "../db";
import { medications } from "../../drizzle/schema";
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
        scientificName: z.string(),
        tradeNames: z.string(),
        indication: z.string().optional(),
        icdCodes: z.string(),
        coverageStatus: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const drizzleInstance = await getDb();
      if (!drizzleInstance) throw new Error("Database connection failed");
      
      const result = await drizzleInstance.insert(medications).values({
        scientificName: input.scientificName,
        tradeNames: JSON.stringify(
          input.tradeNames
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean)
        ),
        indication: input.indication || null,
        icdCodes: JSON.stringify(
          input.icdCodes
            .split(",")
            .map((code) => code.trim())
            .filter(Boolean)
        ),
        coverageStatus: input.coverageStatus || "COVERED",
      });
      return result;
    }),

  // Update medication
  updateMedication: adminProcedure
    .input(
      z.object({
        id: z.number(),
        scientificName: z.string().optional(),
        tradeNames: z.string().optional(),
        indication: z.string().optional(),
        icdCodes: z.string().optional(),
        coverageStatus: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const drizzleInstance = await getDb();
      if (!drizzleInstance) throw new Error("Database connection failed");
      
      const { id, ...data } = input;
      const updateData: any = {};

      if (data.scientificName) updateData.scientificName = data.scientificName;
      if (data.tradeNames)
        updateData.tradeNames = JSON.stringify(
          data.tradeNames
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean)
        );
      if (data.indication) updateData.indication = data.indication;
      if (data.icdCodes)
        updateData.icdCodes = JSON.stringify(
          data.icdCodes
            .split(",")
            .map((code) => code.trim())
            .filter(Boolean)
        );
      if (data.coverageStatus) updateData.coverageStatus = data.coverageStatus;

      const result = await drizzleInstance
        .update(medications)
        .set(updateData)
        .where(eq(medications.id, id));
      return result;
    }),

  // Delete medication
  deleteMedication: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const drizzleInstance = await getDb();
      if (!drizzleInstance) throw new Error("Database connection failed");
      
      const result = await drizzleInstance
        .delete(medications)
        .where(eq(medications.id, input.id));
      return result;
    }),

  // Get all conditions
  getAllConditions: adminProcedure.query(async () => {
    return await getAllConditions();
  }),

  // Get all codes
  getAllCodes: adminProcedure.query(async () => {
    return await getAllCodes();
  }),
});
