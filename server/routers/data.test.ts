import { describe, it, expect, vi, beforeEach } from "vitest";
import { dataRouter } from "./data";
import * as db from "../db";

// Mock the database functions
vi.mock("../db", () => ({
  getAllMedications: vi.fn(),
  getAllConditions: vi.fn(),
  getAllCodes: vi.fn(),
  getAllNonCoveredCodes: vi.fn(),
  searchMedications: vi.fn(),
  searchConditions: vi.fn(),
  searchCodes: vi.fn(),
  searchNonCoveredCodes: vi.fn(),
}));

describe("Data Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("medications", () => {
    it("should get all medications", async () => {
      const mockMeds = [
        { id: 1, scientificName: "Aspirin", tradeNames: '["Bayer"]', indication: "Pain", icdCodes: '["M79.3"]', coverageStatus: "covered" },
      ];
      vi.mocked(db.getAllMedications).mockResolvedValue(mockMeds as any);

      const caller = dataRouter.createCaller({} as any);
      const result = await caller.medications.getAll();

      expect(result).toEqual(mockMeds);
      expect(db.getAllMedications).toHaveBeenCalled();
    });

    it("should search medications", async () => {
      const mockMeds = [
        { id: 1, scientificName: "Aspirin", tradeNames: '["Bayer"]', indication: "Pain", icdCodes: '["M79.3"]', coverageStatus: "covered" },
      ];
      vi.mocked(db.searchMedications).mockResolvedValue(mockMeds as any);

      const caller = dataRouter.createCaller({} as any);
      const result = await caller.medications.search({ query: "Aspirin" });

      expect(result).toEqual(mockMeds);
      expect(db.searchMedications).toHaveBeenCalledWith("Aspirin");
    });
  });

  describe("conditions", () => {
    it("should get all conditions", async () => {
      const mockConditions = [
        { id: 1, name: "Diabetes" },
      ];
      vi.mocked(db.getAllConditions).mockResolvedValue(mockConditions as any);

      const caller = dataRouter.createCaller({} as any);
      const result = await caller.conditions.getAll();

      expect(result).toEqual(mockConditions);
      expect(db.getAllConditions).toHaveBeenCalled();
    });

    it("should search conditions", async () => {
      const mockConditions = [
        { id: 1, name: "Diabetes" },
      ];
      vi.mocked(db.searchConditions).mockResolvedValue(mockConditions as any);

      const caller = dataRouter.createCaller({} as any);
      const result = await caller.conditions.search({ query: "Diabetes" });

      expect(result).toEqual(mockConditions);
      expect(db.searchConditions).toHaveBeenCalledWith("Diabetes");
    });
  });

  describe("codes", () => {
    it("should get all codes", async () => {
      const mockCodes = [
        { id: 1, code: "A00", name: "Cholera", branches: "[]" },
      ];
      vi.mocked(db.getAllCodes).mockResolvedValue(mockCodes as any);

      const caller = dataRouter.createCaller({} as any);
      const result = await caller.codes.getAll();

      expect(result).toEqual(mockCodes);
      expect(db.getAllCodes).toHaveBeenCalled();
    });

    it("should search codes", async () => {
      const mockCodes = [
        { id: 1, code: "A00", name: "Cholera", branches: "[]" },
      ];
      vi.mocked(db.searchCodes).mockResolvedValue(mockCodes as any);

      const caller = dataRouter.createCaller({} as any);
      const result = await caller.codes.search({ query: "A00" });

      expect(result).toEqual(mockCodes);
      expect(db.searchCodes).toHaveBeenCalledWith("A00");
    });
  });

  describe("nonCoveredCodes", () => {
    it("should get all non-covered codes", async () => {
      const mockCodes = [
        { id: 1, code: "Z00", name: "Encounter for general examination", branches: "[]" },
      ];
      vi.mocked(db.getAllNonCoveredCodes).mockResolvedValue(mockCodes as any);

      const caller = dataRouter.createCaller({} as any);
      const result = await caller.nonCoveredCodes.getAll();

      expect(result).toEqual(mockCodes);
      expect(db.getAllNonCoveredCodes).toHaveBeenCalled();
    });

    it("should search non-covered codes", async () => {
      const mockCodes = [
        { id: 1, code: "Z00", name: "Encounter for general examination", branches: "[]" },
      ];
      vi.mocked(db.searchNonCoveredCodes).mockResolvedValue(mockCodes as any);

      const caller = dataRouter.createCaller({} as any);
      const result = await caller.nonCoveredCodes.search({ query: "Z00" });

      expect(result).toEqual(mockCodes);
      expect(db.searchNonCoveredCodes).toHaveBeenCalledWith("Z00");
    });
  });

  describe("admin", () => {
    it("should get database statistics", async () => {
      vi.mocked(db.getAllMedications).mockResolvedValue([{} as any]);
      vi.mocked(db.getAllConditions).mockResolvedValue([{}, {}] as any);
      vi.mocked(db.getAllCodes).mockResolvedValue([{}, {}, {}] as any);
      vi.mocked(db.getAllNonCoveredCodes).mockResolvedValue([{}] as any);

      const caller = dataRouter.createCaller({ user: { id: "1", role: "admin" } } as any);
      const result = await caller.admin.getStats();

      expect(result).toEqual({
        medicationsCount: 1,
        conditionsCount: 2,
        codesCount: 3,
        nonCoveredCodesCount: 1,
      });
    });
  });
});
