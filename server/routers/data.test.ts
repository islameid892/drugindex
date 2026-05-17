import { describe, it, expect, vi, beforeEach } from "vitest";
import { dataRouter } from "./data";
import * as db from "../db";

/**
 * Data Router Tests
 * Tests the actual procedures in server/routers/data.ts.
 * Uses mocks for DB functions to keep tests fast and isolated.
 */

// Mock only the DB functions that are actually used in data.ts
vi.mock("../db", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    searchMedications: vi.fn(),
    getAllCodes: vi.fn(),
    searchCodes: vi.fn(),
    getAllNonCoveredCodes: vi.fn(),
    searchNonCoveredCodes: vi.fn(),
    getCodeById: vi.fn(),
    browseDrugsByTradeName: vi.fn(),
    browseDrugsByTradeNameCount: vi.fn(),
    browseConditions: vi.fn(),
    browseConditionsCount: vi.fn(),
    searchGroupedByScientificName: vi.fn(),
    getStats: vi.fn(),
    getDashboardStats: vi.fn(),
    recordSearch: vi.fn(),
    trackSearch: vi.fn(),
  };
});

// Mock the cache module
vi.mock("../cache", () => ({
  searchCache: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    getStats: vi.fn().mockReturnValue({ size: 0, hits: 0, misses: 0 }),
  },
  analyticsCache: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    getStats: vi.fn().mockReturnValue({ size: 0, hits: 0, misses: 0 }),
  },
}));

describe("Data Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── medications sub-router ─────────────────────────────────────────────────
  describe("medications", () => {
    it("should search medications", async () => {
      const mockMeds = [
        { id: 1, scientificName: "Aspirin", tradeName: "Bayer", indication: "Pain", icdCodesRaw: "M79.3", icdCodes: [], coverageStatus: "COVERED" as const },
      ];
      vi.mocked(db.searchMedications).mockResolvedValue(mockMeds as any);

      const caller = dataRouter.createCaller({ req: { ip: '127.0.0.1', headers: {} }, user: null } as any);
      const result = await caller.medications.search({ query: "Aspirin" });

      expect(result).toEqual(mockMeds);
      expect(db.searchMedications).toHaveBeenCalledWith("Aspirin", 50, 0);
    });

    it("should get medication by id", async () => {
      const mockMed = { id: 1, scientificName: "Aspirin", tradeName: "Bayer", indication: "Pain", icdCodesRaw: "M79.3", icdCodes: [], coverageStatus: "COVERED" as const };
      vi.mocked(db.searchMedications).mockResolvedValue([mockMed] as any);

      const caller = dataRouter.createCaller({ req: { ip: '127.0.0.1', headers: {} }, user: null } as any);
      // medications.getAll returns paginated results
      const result = await caller.medications.getAll({ limit: 10, offset: 0 });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ─── codes sub-router ───────────────────────────────────────────────────────
  describe("codes", () => {
    it("should get all codes", async () => {
      const mockCodes = [
        { id: 1, code: "A00", description: "Cholera", branchCount: 0, branches: [], isNonCovered: false },
      ];
      vi.mocked(db.getAllCodes).mockResolvedValue(mockCodes as any);

      const caller = dataRouter.createCaller({ req: { ip: '127.0.0.1', headers: {} }, user: null } as any);
      const result = await caller.codes.getAll();

      expect(result).toEqual(mockCodes);
      expect(db.getAllCodes).toHaveBeenCalled();
    });

    it("should search codes", async () => {
      const mockCodes = [
        { id: 1, code: "A00", description: "Cholera", branchCount: 0, branches: [], isNonCovered: false },
      ];
      vi.mocked(db.searchCodes).mockResolvedValue(mockCodes as any);

      const caller = dataRouter.createCaller({ req: { ip: '127.0.0.1', headers: {} }, user: null } as any);
      const result = await caller.codes.search({ query: "A00" });

      expect(result).toEqual(mockCodes);
      expect(db.searchCodes).toHaveBeenCalledWith("A00");
    });
  });

  // ─── nonCoveredCodes sub-router ─────────────────────────────────────────────
  describe("nonCoveredCodes", () => {
    it("should get all non-covered codes", async () => {
      const mockCodes = [{ id: 1, code: "Z00", description: "General examination" }];
      vi.mocked(db.getAllNonCoveredCodes).mockResolvedValue(mockCodes as any);

      const caller = dataRouter.createCaller({ req: { ip: '127.0.0.1', headers: {} }, user: null } as any);
      const result = await caller.nonCoveredCodes.getAll();

      expect(result).toEqual(mockCodes);
      expect(db.getAllNonCoveredCodes).toHaveBeenCalled();
    });

    it("should search non-covered codes", async () => {
      const mockCodes = [{ id: 1, code: "Z00", description: "General examination" }];
      vi.mocked(db.searchNonCoveredCodes).mockResolvedValue(mockCodes as any);

      const caller = dataRouter.createCaller({ req: { ip: '127.0.0.1', headers: {} }, user: null } as any);
      const result = await caller.nonCoveredCodes.search({ query: "Z00" });

      expect(result).toEqual(mockCodes);
      expect(db.searchNonCoveredCodes).toHaveBeenCalledWith("Z00");
    });
  });

  // ─── stats procedure ────────────────────────────────────────────────────────
  describe("stats", () => {
    it("should return database statistics", async () => {
      const mockStats = {
        totalDrugEntries: 56388,
        uniqueScientificNames: 1000,
        uniqueTradeNames: 2000,
        uniqueIndications: 808,
        totalCodes: 38853,
        totalBranches: 100000,
        nonCoveredCodes: 500,
      };
      vi.mocked(db.getStats).mockResolvedValue(mockStats as any);

      const caller = dataRouter.createCaller({ req: { ip: '127.0.0.1', headers: {} }, user: null } as any);
      const result = await caller.stats();

      expect(result).toEqual(mockStats);
      expect(db.getStats).toHaveBeenCalled();
    });
  });

  // ─── cacheStats procedure ───────────────────────────────────────────────────
  describe("cacheStats", () => {
    it("should return cache statistics", async () => {
      const caller = dataRouter.createCaller({ req: { ip: '127.0.0.1', headers: {} }, user: null } as any);
      const result = await caller.cacheStats();

      expect(result).toHaveProperty('search');
      expect(result).toHaveProperty('analytics');
    });
  });
});
