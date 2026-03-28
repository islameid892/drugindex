import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
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
import mysql from "mysql2/promise";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new Error("Unauthorized: Admin access required");
  }
  return next({ ctx });
});

const drugUpdateSchema = z.object({
  scientific_name: z.string(),
  trade_name: z.string(),
  price: z.number(),
  pharmacological_action: z.string().nullable().optional(),
  black_box_warning: z.string().nullable().optional(),
  uses: z.string().nullable().optional(),
  pregnancy_category: z.string().nullable().optional(),
  standard_dose: z.string().nullable().optional(),
  adjusted_dose: z.string().nullable().optional(),
  neonatal_dose: z.string().nullable().optional(),
  dose_source: z.string().nullable().optional(),
  contraindicated_interactions: z.string().nullable().optional(),
  major_interactions: z.string().nullable().optional(),
  moderate_interactions: z.string().nullable().optional(),
  minor_interactions: z.string().nullable().optional(),
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

  /**
   * Bulk update drugs from JSON data (for price updates)
   * Used for batch synchronization with Excel files
   */
  bulkUpdateDrugs: publicProcedure
    .input(
      z.object({
        drugs: z.array(drugUpdateSchema),
        batchSize: z.number().default(100),
      })
    )
    .mutation(async ({ input }) => {
      const { drugs, batchSize } = input;

      let updated = 0;
      let inserted = 0;
      let skipped = 0;
      const startTime = Date.now();

      // Create direct MySQL connection pool
      const pool = mysql.createPool({
        uri: process.env.DATABASE_URL!,
        connectionLimit: 10,
        waitForConnections: true,
        queueLimit: 0,
      });

      try {
        // Process in batches
        for (let i = 0; i < drugs.length; i += batchSize) {
          const batch = drugs.slice(i, i + batchSize);

          // Process each drug in parallel within the batch
          const promises = batch.map(async (drug) => {
            const conn = await pool.getConnection();
            try {
              // Check if drug exists
              const [existing] = await conn.query(
                "SELECT id FROM drug_lens WHERE scientific_name = ? AND trade_name = ? LIMIT 1",
                [drug.scientific_name, drug.trade_name]
              );

              if (Array.isArray(existing) && existing.length > 0) {
                // Update existing drug
                await conn.query(
                  `UPDATE drug_lens SET 
                    price = ?,
                    pharmacological_action = COALESCE(?, pharmacological_action),
                    black_box_warning = COALESCE(?, black_box_warning),
                    uses = COALESCE(?, uses),
                    pregnancy_category = COALESCE(?, pregnancy_category),
                    standard_dose = COALESCE(?, standard_dose),
                    adjusted_dose = COALESCE(?, adjusted_dose),
                    neonatal_dose = COALESCE(?, neonatal_dose),
                    dose_source = COALESCE(?, dose_source),
                    contraindicated_interactions = COALESCE(?, contraindicated_interactions),
                    major_interactions = COALESCE(?, major_interactions),
                    moderate_interactions = COALESCE(?, moderate_interactions),
                    minor_interactions = COALESCE(?, minor_interactions),
                    updatedAt = NOW()
                  WHERE id = ?`,
                  [
                    drug.price,
                    drug.pharmacological_action || null,
                    drug.black_box_warning || null,
                    drug.uses || null,
                    drug.pregnancy_category || null,
                    drug.standard_dose || null,
                    drug.adjusted_dose || null,
                    drug.neonatal_dose || null,
                    drug.dose_source || null,
                    drug.contraindicated_interactions || null,
                    drug.major_interactions || null,
                    drug.moderate_interactions || null,
                    drug.minor_interactions || null,
                    (existing[0] as any).id,
                  ]
                );
                updated++;
              } else {
                // Insert new drug
                await conn.query(
                  `INSERT INTO drug_lens (
                    scientific_name, trade_name, price,
                    pharmacological_action, black_box_warning, uses,
                    pregnancy_category, standard_dose, adjusted_dose,
                    neonatal_dose, dose_source,
                    contraindicated_interactions, major_interactions,
                    moderate_interactions, minor_interactions,
                    createdAt, updatedAt
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
                  [
                    drug.scientific_name,
                    drug.trade_name,
                    drug.price,
                    drug.pharmacological_action || null,
                    drug.black_box_warning || null,
                    drug.uses || null,
                    drug.pregnancy_category || null,
                    drug.standard_dose || null,
                    drug.adjusted_dose || null,
                    drug.neonatal_dose || null,
                    drug.dose_source || null,
                    drug.contraindicated_interactions || null,
                    drug.major_interactions || null,
                    drug.moderate_interactions || null,
                    drug.minor_interactions || null,
                  ]
                );
                inserted++;
              }
            } catch (err) {
              console.error(`Error processing drug ${drug.trade_name}:`, err);
              skipped++;
            } finally {
              conn.release();
            }
          });

          await Promise.all(promises);

          // Log progress
          const progress = Math.min(i + batchSize, drugs.length);
          console.log(
            `[Bulk Update] Progress: ${progress}/${drugs.length} (Updated: ${updated}, Inserted: ${inserted}, Skipped: ${skipped})`
          );
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        return {
          success: true,
          updated,
          inserted,
          skipped,
          total: updated + inserted + skipped,
          duration: `${duration}s`,
        };
      } catch (err) {
        console.error("Bulk update error:", err);
        throw new Error(
          `Bulk update failed: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      } finally {
        await pool.end();
      }
    }),
});
