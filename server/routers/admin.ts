import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getAllCodes,
  getDashboardStats,
  getDb,
  searchMedications,
} from "../db";
import {
  drugEntries,
  drugEntryCodes,
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
  // Get all drug entries (paginated)
  getAllMedications: adminProcedure
    .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      return db.select().from(drugEntries)
        .limit(input?.limit ?? 100)
        .offset(input?.offset ?? 0);
    }),

  // Get all codes
  getAllCodes: adminProcedure.query(async () => {
    return await getAllCodes(2100, 0);
  }),

  // Get dashboard stats
  getStats: adminProcedure.query(async () => {
    return await getDashboardStats();
  }),

  // Add a new drug entry
  addMedication: adminProcedure
    .input(
      z.object({
        scientificName: z.string().min(1),
        tradeName: z.string().min(1),
        indication: z.string().min(1),
        icdCodesRaw: z.string().default(""),
        icdCodesList: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();

      // Insert drug entry
      const [result] = await db.insert(drugEntries).values({
        scientificName: input.scientificName,
        tradeName: input.tradeName,
        indication: input.indication,
        icdCodesRaw: input.icdCodesRaw,
      });
      const entryId = (result as any).insertId as number;

      // Link ICD codes
      if (input.icdCodesList.length > 0) {
        const codeRows = await db
          .select({ id: icdCodes.id })
          .from(icdCodes)
          .where(inArray(icdCodes.code, input.icdCodesList));
        if (codeRows.length > 0) {
          await db.insert(drugEntryCodes).values(
            (codeRows as Array<{ id: number }>).map((c) => ({ drugEntryId: entryId, codeId: c.id }))
          );
        }
      }

      const [entry] = await db.select().from(drugEntries).where(eq(drugEntries.id, entryId));
      return entry;
    }),

  // Update a drug entry
  updateMedication: adminProcedure
    .input(
      z.object({
        id: z.number(),
        scientificName: z.string().optional(),
        tradeName: z.string().optional(),
        indication: z.string().optional(),
        icdCodesRaw: z.string().optional(),
        icdCodesList: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();

      const updateData: Record<string, any> = {};
      if (input.scientificName !== undefined) updateData.scientificName = input.scientificName;
      if (input.tradeName !== undefined) updateData.tradeName = input.tradeName;
      if (input.indication !== undefined) updateData.indication = input.indication;
      if (input.icdCodesRaw !== undefined) updateData.icdCodesRaw = input.icdCodesRaw;

      if (Object.keys(updateData).length > 0) {
        await db.update(drugEntries).set(updateData).where(eq(drugEntries.id, input.id));
      }

      if (input.icdCodesList !== undefined) {
        await db.delete(drugEntryCodes).where(eq(drugEntryCodes.drugEntryId, input.id));
        if (input.icdCodesList.length > 0) {
          const codeRows = await db
            .select({ id: icdCodes.id })
            .from(icdCodes)
            .where(inArray(icdCodes.code, input.icdCodesList));
          if (codeRows.length > 0) {
            await db.insert(drugEntryCodes).values(
              (codeRows as Array<{ id: number }>).map((c) => ({ drugEntryId: input.id, codeId: c.id }))
            );
          }
        }
      }

      const [entry] = await db.select().from(drugEntries).where(eq(drugEntries.id, input.id));
      return entry;
    }),

  // Delete a drug entry
  deleteMedication: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      await db.delete(drugEntries).where(eq(drugEntries.id, input.id));
      return { success: true };
    }),
});
