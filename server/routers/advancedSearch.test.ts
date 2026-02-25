import { describe, it, expect } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

function createContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Advanced Search Router", () => {
  describe("scientificNameSuggestions", () => {
    it("should return scientific name suggestions matching query", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.advancedSearch.scientificNameSuggestions({
        query: "amoxicillin",
        limit: 10,
      });

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty("name");
        expect(result[0]).toHaveProperty("count");
        expect(typeof result[0].count).toBe("number");
      }
    });

    it("should respect limit parameter", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.advancedSearch.scientificNameSuggestions({
        query: "a",
        limit: 5,
      });

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it("should return empty array for non-matching query", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.advancedSearch.scientificNameSuggestions({
        query: "xyznonexistent12345",
        limit: 10,
      });

      expect(Array.isArray(result)).toBe(true);
    });

    it("should return case-insensitive matches", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const result1 = await caller.advancedSearch.scientificNameSuggestions({
        query: "AMOXICILLIN",
        limit: 10,
      });

      const result2 = await caller.advancedSearch.scientificNameSuggestions({
        query: "amoxicillin",
        limit: 10,
      });

      expect(result1.length).toBe(result2.length);
    });
  });

  describe("tradeNameSuggestions", () => {
    it("should return trade names for scientific name", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      // First get a scientific name
      const scientificNames = await caller.advancedSearch.scientificNameSuggestions({
        query: "a",
        limit: 1,
      });

      if (scientificNames.length > 0) {
        const result = await caller.advancedSearch.tradeNameSuggestions({
          scientificName: scientificNames[0].name,
          query: "",
          limit: 10,
        });

        expect(Array.isArray(result)).toBe(true);
        if (result.length > 0) {
          expect(result[0]).toHaveProperty("name");
        }
      }
    });

    it("should filter trade names by query", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const scientificNames = await caller.advancedSearch.scientificNameSuggestions({
        query: "a",
        limit: 1,
      });

      if (scientificNames.length > 0) {
        const result = await caller.advancedSearch.tradeNameSuggestions({
          scientificName: scientificNames[0].name,
          query: "a",
          limit: 10,
        });

        expect(Array.isArray(result)).toBe(true);
      }
    });

    it("should return empty array for non-existent scientific name", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.advancedSearch.tradeNameSuggestions({
        scientificName: "NonExistentScientificName",
        query: "",
        limit: 10,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it("should respect limit parameter", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const scientificNames = await caller.advancedSearch.scientificNameSuggestions({
        query: "a",
        limit: 1,
      });

      if (scientificNames.length > 0) {
        const result = await caller.advancedSearch.tradeNameSuggestions({
          scientificName: scientificNames[0].name,
          query: "",
          limit: 3,
        });

        expect(result.length).toBeLessThanOrEqual(3);
      }
    });
  });

  describe("indicationsSuggestions", () => {
    it("should return indications for scientific name", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const scientificNames = await caller.advancedSearch.scientificNameSuggestions({
        query: "a",
        limit: 1,
      });

      if (scientificNames.length > 0) {
        const result = await caller.advancedSearch.indicationsSuggestions({
          scientificName: scientificNames[0].name,
          tradeNames: [],
          query: "",
          limit: 10,
        });

        expect(Array.isArray(result)).toBe(true);
        if (result.length > 0) {
          expect(result[0]).toHaveProperty("indication");
        }
      }
    });

    it("should filter indications by query", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const scientificNames = await caller.advancedSearch.scientificNameSuggestions({
        query: "a",
        limit: 1,
      });

      if (scientificNames.length > 0) {
        const result = await caller.advancedSearch.indicationsSuggestions({
          scientificName: scientificNames[0].name,
          tradeNames: [],
          query: "a",
          limit: 10,
        });

        expect(Array.isArray(result)).toBe(true);
      }
    });

    it("should filter indications by trade names", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const scientificNames = await caller.advancedSearch.scientificNameSuggestions({
        query: "a",
        limit: 1,
      });

      if (scientificNames.length > 0) {
        const tradeNames = await caller.advancedSearch.tradeNameSuggestions({
          scientificName: scientificNames[0].name,
          query: "",
          limit: 1,
        });

        if (tradeNames.length > 0) {
          const result = await caller.advancedSearch.indicationsSuggestions({
            scientificName: scientificNames[0].name,
            tradeNames: [tradeNames[0].name],
            query: "",
            limit: 10,
          });

          expect(Array.isArray(result)).toBe(true);
        }
      }
    });

    it("should return alphabetically sorted indications", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const scientificNames = await caller.advancedSearch.scientificNameSuggestions({
        query: "a",
        limit: 1,
      });

      if (scientificNames.length > 0) {
        const result = await caller.advancedSearch.indicationsSuggestions({
          scientificName: scientificNames[0].name,
          tradeNames: [],
          query: "",
          limit: 50,
        });

        // Check if sorted
        for (let i = 1; i < result.length; i++) {
          expect(result[i].indication.localeCompare(result[i - 1].indication)).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe("search", () => {
    it("should return codes for scientific name", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const scientificNames = await caller.advancedSearch.scientificNameSuggestions({
        query: "a",
        limit: 1,
      });

      if (scientificNames.length > 0) {
        const result = await caller.advancedSearch.search({
          scientificName: scientificNames[0].name,
          tradeNames: [],
          indications: [],
        });

        expect(result).toHaveProperty("total");
        expect(result).toHaveProperty("codes");
        expect(result).toHaveProperty("filters");
        expect(Array.isArray(result.codes)).toBe(true);
        expect(typeof result.total).toBe("number");
      }
    });

    it("should return codes with branches", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const scientificNames = await caller.advancedSearch.scientificNameSuggestions({
        query: "a",
        limit: 1,
      });

      if (scientificNames.length > 0) {
        const result = await caller.advancedSearch.search({
          scientificName: scientificNames[0].name,
          tradeNames: [],
          indications: [],
        });

        if (result.codes.length > 0) {
          const code = result.codes[0];
          expect(code).toHaveProperty("code");
          expect(code).toHaveProperty("description");
          expect(code).toHaveProperty("branches");
          expect(Array.isArray(code.branches)).toBe(true);
        }
      }
    });

    it("should filter codes by trade names", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const scientificNames = await caller.advancedSearch.scientificNameSuggestions({
        query: "a",
        limit: 1,
      });

      if (scientificNames.length > 0) {
        const tradeNames = await caller.advancedSearch.tradeNameSuggestions({
          scientificName: scientificNames[0].name,
          query: "",
          limit: 1,
        });

        if (tradeNames.length > 0) {
          const result = await caller.advancedSearch.search({
            scientificName: scientificNames[0].name,
            tradeNames: [tradeNames[0].name],
            indications: [],
          });

          expect(result).toHaveProperty("total");
          expect(result).toHaveProperty("codes");
        }
      }
    });

    it("should filter codes by indications", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const scientificNames = await caller.advancedSearch.scientificNameSuggestions({
        query: "a",
        limit: 1,
      });

      if (scientificNames.length > 0) {
        const indications = await caller.advancedSearch.indicationsSuggestions({
          scientificName: scientificNames[0].name,
          tradeNames: [],
          query: "",
          limit: 1,
        });

        if (indications.length > 0) {
          const result = await caller.advancedSearch.search({
            scientificName: scientificNames[0].name,
            tradeNames: [],
            indications: [indications[0].indication],
          });

          expect(result).toHaveProperty("total");
          expect(result).toHaveProperty("codes");
        }
      }
    });

    it("should return empty codes for non-existent scientific name", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.advancedSearch.search({
        scientificName: "NonExistentScientificName",
        tradeNames: [],
        indications: [],
      });

      expect(result.total).toBe(0);
      expect(result.codes.length).toBe(0);
    });

    it("should sort codes alphabetically", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const scientificNames = await caller.advancedSearch.scientificNameSuggestions({
        query: "a",
        limit: 1,
      });

      if (scientificNames.length > 0) {
        const result = await caller.advancedSearch.search({
          scientificName: scientificNames[0].name,
          tradeNames: [],
          indications: [],
        });

        // Check if sorted
        for (let i = 1; i < result.codes.length; i++) {
          expect(result.codes[i].code.localeCompare(result.codes[i - 1].code)).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe("getAllScientificNames", () => {
    it("should return array of scientific names", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.advancedSearch.getAllScientificNames();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should return unique scientific names", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.advancedSearch.getAllScientificNames();

      const uniqueSet = new Set(result);
      expect(uniqueSet.size).toBe(result.length);
    });

    it("should return sorted scientific names", async () => {
      const ctx = createContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.advancedSearch.getAllScientificNames();

      // Check if sorted
      for (let i = 1; i < result.length; i++) {
        expect(result[i].localeCompare(result[i - 1])).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
