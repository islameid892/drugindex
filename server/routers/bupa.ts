import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { bupaPrerequisites } from "../../drizzle/schema";
import { getDb } from "../db";
import { like } from "drizzle-orm";

export const bupaRouter = router({
  // Get all prerequisites
  getAll: publicProcedure.query(async () => {
    const db = await getDb();
    return await db.select().from(bupaPrerequisites);
  }),

  // Search prerequisites by service name or ICD code
  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1).max(100),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      const { query } = input;
      const searchTerm = `%${query}%`;

      return await db
        .select()
        .from(bupaPrerequisites)
        .where((col: any) => like(col.serviceName, searchTerm))
        .limit(100);
    }),

  // Get prerequisites by ICD code
  getByIcdCode: publicProcedure
    .input(
      z.object({
        icdCode: z.string().min(1).max(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      const { icdCode } = input;
      const searchTerm = `%${icdCode}%`;

      return await db
        .select()
        .from(bupaPrerequisites)
        .where((col: any) => like(col.icdCodes, searchTerm));
    }),

  // Get single prerequisite by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      const { id } = input;
      const result = await db
        .select()
        .from(bupaPrerequisites)
        .where((col: any) => col.id === id)
        .limit(1);

      return result[0] || null;
    }),

  // Get prerequisites by service name
  getByServiceName: publicProcedure
    .input(
      z.object({
        serviceName: z.string().min(1).max(255),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      const { serviceName } = input;
      const searchTerm = `%${serviceName}%`;

      return await db
        .select()
        .from(bupaPrerequisites)
        .where((col: any) => like(col.serviceName, searchTerm));
    }),

  // Get count of all prerequisites
  getCount: publicProcedure.query(async () => {
    const db = await getDb();
    const result = await db
      .select({ count: db.count() })
      .from(bupaPrerequisites);
    return result[0]?.count || 0;
  })
});
