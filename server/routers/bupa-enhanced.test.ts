import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "../db";
import { bupaPrerequisites, icdCodes, icdBranches } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Bupa Enhanced Router - ICD Code Linking", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  describe("ICD Code Enrichment", () => {
    it("should find Bupa prerequisites with valid ICD codes", async () => {
      const bupa = await db
        .select()
        .from(bupaPrerequisites)
        .limit(1);

      expect(bupa.length).toBeGreaterThan(0);
      expect(bupa[0]).toHaveProperty("icdCodes");
      expect(typeof bupa[0].icdCodes).toBe("string");
    });

    it("should parse comma-separated ICD codes from Bupa prerequisites", async () => {
      const bupa = await db
        .select()
        .from(bupaPrerequisites)
        .limit(1);

      if (bupa.length > 0 && bupa[0].icdCodes) {
        const codes = bupa[0].icdCodes
          .split(",")
          .map((c: string) => c.trim())
          .filter((c: string) => c.length > 0);

        expect(Array.isArray(codes)).toBe(true);
        expect(codes.length).toBeGreaterThan(0);
      }
    });

    it("should find matching ICD codes in icd_codes table", async () => {
      const bupa = await db
        .select()
        .from(bupaPrerequisites)
        .limit(1);

      if (bupa.length > 0) {
        const codes = bupa[0].icdCodes
          .split(",")
          .map((c: string) => c.trim())
          .filter((c: string) => c.length > 0);

        if (codes.length > 0) {
          const firstCode = codes[0];
          const [icdCode] = await db
            .select()
            .from(icdCodes)
            .where(eq(icdCodes.code, firstCode));

          if (icdCode) {
            expect(icdCode).toHaveProperty("id");
            expect(icdCode).toHaveProperty("code", firstCode);
            expect(icdCode).toHaveProperty("description");
          }
        }
      }
    });

    it("should find ICD branches for a given code", async () => {
      const [icdCode] = await db
        .select()
        .from(icdCodes)
        .limit(1);

      if (icdCode) {
        const branches = await db
          .select()
          .from(icdBranches)
          .where(eq(icdBranches.parentCodeId, icdCode.id));

        expect(Array.isArray(branches)).toBe(true);
        // Some codes may not have branches, so we just check the type
        if (branches.length > 0) {
          expect(branches[0]).toHaveProperty("branchCode");
          expect(branches[0]).toHaveProperty("branchDescription");
        }
      }
    });
  });

  describe("Data Structure Validation", () => {
    it("should have valid Bupa prerequisites structure", async () => {
      const bupa = await db
        .select()
        .from(bupaPrerequisites)
        .limit(1);

      if (bupa.length > 0) {
        const item = bupa[0];
        expect(item).toHaveProperty("id");
        expect(item).toHaveProperty("serviceName");
        expect(item).toHaveProperty("icdCodes");
        expect(item).toHaveProperty("requirements");
      }
    });

    it("should have valid ICD codes structure", async () => {
      const [icdCode] = await db
        .select()
        .from(icdCodes)
        .limit(1);

      if (icdCode) {
        expect(icdCode).toHaveProperty("id");
        expect(icdCode).toHaveProperty("code");
        expect(icdCode).toHaveProperty("description");
        expect(typeof icdCode.code).toBe("string");
      }
    });

    it("should have valid ICD branches structure", async () => {
      const [branch] = await db
        .select()
        .from(icdBranches)
        .limit(1);

      if (branch) {
        expect(branch).toHaveProperty("id");
        expect(branch).toHaveProperty("parentCodeId");
        expect(branch).toHaveProperty("branchCode");
        expect(branch).toHaveProperty("branchDescription");
      }
    });
  });

  describe("Linking Validation", () => {
    it("should verify Bupa prerequisites exist", async () => {
      const count = await db
        .select()
        .from(bupaPrerequisites);

      expect(count.length).toBeGreaterThan(0);
    });

    it("should verify ICD codes exist", async () => {
      const count = await db
        .select()
        .from(icdCodes);

      expect(count.length).toBeGreaterThan(0);
    });

    it("should verify ICD branches exist", async () => {
      const count = await db
        .select()
        .from(icdBranches);

      expect(count.length).toBeGreaterThan(0);
    });

    it("should have foreign key relationships between tables", async () => {
      const branches = await db
        .select()
        .from(icdBranches)
        .limit(10);

      // Verify that icdBranches table has parentCodeId references
      expect(branches.length).toBeGreaterThan(0);
      expect(branches[0]).toHaveProperty("parentCodeId");
      // At least some branches should have a parentCodeId
      const branchesWithParent = branches.filter((b: any) => b.parentCodeId);
      expect(branchesWithParent.length).toBeGreaterThan(0);
    });
  });
});
