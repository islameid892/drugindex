import { publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { bupaPrerequisites, icdCodes, icdBranches } from "../../drizzle/schema";
import { eq, like, inArray } from "drizzle-orm";

/**
 * Enhanced Bupa Prerequisites Router
 * 
 * This router provides enriched data by:
 * 1. Parsing ICD codes from Bupa prerequisites
 * 2. Looking up code names and descriptions from icd_codes table
 * 3. Finding related branches from icd_branches table
 * 4. Returning complete linked data structure
 */

export const bupaEnhancedRouter = {
  /**
   * Get all Bupa prerequisites with enriched ICD code information
   */
  getAllWithCodes: publicProcedure.query(async () => {
    const db = await getDb();
    
    const allBupa = await db.select().from(bupaPrerequisites);
    
    const enriched = await Promise.all(
      allBupa.map(async (bupa: any) => {
        const codes = await enrichBupaWithCodes(db, bupa);
        return codes;
      })
    );
    
    return enriched;
  }),

  /**
   * Search Bupa prerequisites by service name with enriched codes
   */
  searchByService: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      const results = await db
        .select()
        .from(bupaPrerequisites)
        .where(like(bupaPrerequisites.serviceName, `%${input.query}%`));
      
      const enriched = await Promise.all(
        results.map(async (bupa: any) => enrichBupaWithCodes(db, bupa))
      );
      
      return enriched;
    }),

  /**
   * Get Bupa prerequisite by ID with full enriched data
   */
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      const [bupa] = await db
        .select()
        .from(bupaPrerequisites)
        .where(eq(bupaPrerequisites.id, input.id));
      
      if (!bupa) return null;
      
      return enrichBupaWithCodes(db, bupa);
    }),

  /**
   * Get ICD code details including branches
   */
  getIcdCodeDetails: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      const [icdCode] = await db
        .select()
        .from(icdCodes)
        .where(eq(icdCodes.code, input.code));
      
      if (!icdCode) return null;
      
      const branches = await db
        .select()
        .from(icdBranches)
        .where(eq(icdBranches.parentCodeId, icdCode.id));
      
      return {
        code: icdCode,
        branches,
      };
    }),

  /**
   * Get Bupa prerequisites for a specific ICD code
   */
  getByIcdCode: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      // Find the ICD code
      const [icdCode] = await db
        .select()
        .from(icdCodes)
        .where(eq(icdCodes.code, input.code));
      
      if (!icdCode) return [];
      
      // Find all Bupa prerequisites that mention this code
      const allBupa = await db.select().from(bupaPrerequisites);
      
      const matching = allBupa.filter((bupa: any) => {
        const codes = bupa.icdCodes.split(",").map((c: string) => c.trim());
        return codes.includes(input.code);
      });
      
      const enriched = await Promise.all(
        matching.map(async (bupa: any) => enrichBupaWithCodes(db, bupa))
      );
      
      return enriched;
    }),
};

/**
 * Helper function to enrich Bupa prerequisite with ICD code details
 */
async function enrichBupaWithCodes(db: any, bupa: any) {
  // Parse the comma-separated ICD codes
  const codeStrings = bupa.icdCodes
    .split(",")
    .map((c: string) => c.trim())
    .filter((c: string) => c.length > 0);

  // Look up each code in both icd_codes and icd_branches tables
  const enrichedCodes = await Promise.all(
    codeStrings.map(async (codeStr: string) => {
      // First, try to find in icd_codes table (main codes)
      const [icdCode] = await db
        .select()
        .from(icdCodes)
        .where(eq(icdCodes.code, codeStr));

      if (icdCode) {
        // Get branches for this code
        const branches = await db
          .select()
          .from(icdBranches)
          .where(eq(icdBranches.parentCodeId, icdCode.id));

        return {
          code: codeStr,
          id: icdCode.id,
          name: icdCode.name,
          description: icdCode.description,
          branches: branches.map((b: any) => ({
            id: b.id,
            code: b.branchCode,
            description: b.branchDescription,
          })),
          found: true,
        };
      }

      // If not found in icd_codes, try to find in icd_branches (subcodes like I61.9)
      const [branchCode] = await db
        .select()
        .from(icdBranches)
        .where(eq(icdBranches.branchCode, codeStr));

      if (branchCode) {
        return {
          code: codeStr,
          id: branchCode.id,
          name: branchCode.branchDescription,
          description: branchCode.branchDescription,
          branches: [], // Subcodes don't have further branches
          found: true,
        };
      }

      // Code not found in either table
      return {
        code: codeStr,
        name: null,
        description: null,
        branches: [],
        found: false,
      };
    })
  );

  return {
    ...bupa,
    enrichedCodes,
    totalCodes: enrichedCodes.length,
    foundCodes: enrichedCodes.filter((c: any) => c.found).length,
  };
}
