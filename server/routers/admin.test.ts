import { describe, it, expect, vi, beforeEach } from "vitest";
import { adminRouter } from "./admin";
import * as db from "../db";

// Mock the database functions
vi.mock("../db", () => ({
  getSystemStats: vi.fn(),
  getAllUsers: vi.fn(),
  logAuditAction: vi.fn(),
  getAuditLogs: vi.fn(),
  getSystemSetting: vi.fn(),
  updateSystemSetting: vi.fn(),
  addMedication: vi.fn(),
  updateMedication: vi.fn(),
  deleteMedication: vi.fn(),
  addCondition: vi.fn(),
  updateCondition: vi.fn(),
  deleteCondition: vi.fn(),
  addCode: vi.fn(),
  updateCode: vi.fn(),
  deleteCode: vi.fn(),
  getAllMedications: vi.fn(),
  getAllConditions: vi.fn(),
  getAllCodes: vi.fn(),
}));

describe("Admin Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSystemStats", () => {
    it("should return system statistics", async () => {
      const mockStats = {
        medications: 100,
        conditions: 50,
        codes: 200,
        users: 10,
        totalSearches: 5000,
      };

      vi.mocked(db.getSystemStats).mockResolvedValue(mockStats);

      const result = await db.getSystemStats();

      expect(result).toEqual(mockStats);
      expect(result.medications).toBe(100);
      expect(result.totalSearches).toBe(5000);
    });

    it("should return zero values when no data exists", async () => {
      const mockStats = {
        medications: 0,
        conditions: 0,
        codes: 0,
        users: 0,
        totalSearches: 0,
      };

      vi.mocked(db.getSystemStats).mockResolvedValue(mockStats);

      const result = await db.getSystemStats();

      expect(result.medications).toBe(0);
      expect(result.totalSearches).toBe(0);
    });
  });

  describe("getAllUsers", () => {
    it("should return list of all users", async () => {
      const mockUsers = [
        {
          id: 1,
          openId: "user1",
          name: "Admin User",
          email: "admin@example.com",
          role: "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
          loginMethod: "oauth",
        },
        {
          id: 2,
          openId: "user2",
          name: "Regular User",
          email: "user@example.com",
          role: "user",
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
          loginMethod: "oauth",
        },
      ];

      vi.mocked(db.getAllUsers).mockResolvedValue(mockUsers);

      const result = await db.getAllUsers();

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe("admin");
      expect(result[1].role).toBe("user");
    });

    it("should return empty array when no users exist", async () => {
      vi.mocked(db.getAllUsers).mockResolvedValue([]);

      const result = await db.getAllUsers();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe("getAuditLogs", () => {
    it("should return audit logs", async () => {
      const mockLogs = [
        {
          id: 1,
          adminId: 1,
          action: "UPDATE_SETTING",
          entityType: "systemSetting",
          entityId: null,
          changes: '{"key":"test"}',
          timestamp: new Date(),
        },
      ];

      vi.mocked(db.getAuditLogs).mockResolvedValue(mockLogs);

      const result = await db.getAuditLogs(50);

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe("UPDATE_SETTING");
    });

    it("should return empty array when no logs exist", async () => {
      vi.mocked(db.getAuditLogs).mockResolvedValue([]);

      const result = await db.getAuditLogs(50);

      expect(result).toEqual([]);
    });
  });

  describe("getSystemSetting", () => {
    it("should return system setting by key", async () => {
      const mockSetting = {
        id: 1,
        key: "maintenance_mode",
        value: "false",
        description: "Enable/disable maintenance mode",
        updatedBy: 1,
        updatedAt: new Date(),
      };

      vi.mocked(db.getSystemSetting).mockResolvedValue(mockSetting);

      const result = await db.getSystemSetting("maintenance_mode");

      expect(result).toEqual(mockSetting);
      expect(result?.key).toBe("maintenance_mode");
    });

    it("should return undefined when setting not found", async () => {
      vi.mocked(db.getSystemSetting).mockResolvedValue(undefined);

      const result = await db.getSystemSetting("nonexistent");

      expect(result).toBeUndefined();
    });
  });

  describe("Medication Management", () => {
    it("should add new medication", async () => {
      const newMed = {
        scientificName: "Paracetamol",
        tradeNames: '["Panadol"]',
        indication: "Pain relief",
        icdCodes: '["M79.3"]',
        coverageStatus: "COVERED",
      };

      vi.mocked(db.addMedication).mockResolvedValue(undefined);

      await db.addMedication(newMed);

      expect(db.addMedication).toHaveBeenCalledWith(newMed);
    });

    it("should update existing medication", async () => {
      const updates = {
        indication: "Updated indication",
      };

      vi.mocked(db.updateMedication).mockResolvedValue(undefined);

      await db.updateMedication(1, updates);

      expect(db.updateMedication).toHaveBeenCalledWith(1, updates);
    });

    it("should delete medication", async () => {
      vi.mocked(db.deleteMedication).mockResolvedValue(undefined);

      await db.deleteMedication(1);

      expect(db.deleteMedication).toHaveBeenCalledWith(1);
    });
  });

  describe("Condition Management", () => {
    it("should add new condition", async () => {
      const newCondition = {
        name: "Diabetes",
        description: "Blood sugar disorder",
        relatedMedications: '["Metformin"]',
        relatedCodes: '["E11"]',
      };

      vi.mocked(db.addCondition).mockResolvedValue(undefined);

      await db.addCondition(newCondition);

      expect(db.addCondition).toHaveBeenCalledWith(newCondition);
    });

    it("should update existing condition", async () => {
      const updates = {
        description: "Updated description",
      };

      vi.mocked(db.updateCondition).mockResolvedValue(undefined);

      await db.updateCondition(1, updates);

      expect(db.updateCondition).toHaveBeenCalledWith(1, updates);
    });

    it("should delete condition", async () => {
      vi.mocked(db.deleteCondition).mockResolvedValue(undefined);

      await db.deleteCondition(1);

      expect(db.deleteCondition).toHaveBeenCalledWith(1);
    });
  });

  describe("Code Management", () => {
    it("should add new code", async () => {
      const newCode = {
        code: "E11",
        description: "Type 2 diabetes mellitus",
        branches: '["E11.0"]',
        relatedMedications: '["Metformin"]',
      };

      vi.mocked(db.addCode).mockResolvedValue(undefined);

      await db.addCode(newCode);

      expect(db.addCode).toHaveBeenCalledWith(newCode);
    });

    it("should update existing code", async () => {
      const updates = {
        description: "Updated description",
      };

      vi.mocked(db.updateCode).mockResolvedValue(undefined);

      await db.updateCode(1, updates);

      expect(db.updateCode).toHaveBeenCalledWith(1, updates);
    });

    it("should delete code", async () => {
      vi.mocked(db.deleteCode).mockResolvedValue(undefined);

      await db.deleteCode(1);

      expect(db.deleteCode).toHaveBeenCalledWith(1);
    });
  });

  describe("Audit Logging", () => {
    it("should log admin actions", async () => {
      const adminId = 1;
      const action = "UPDATE_MEDICATION";
      const entityType = "medication";
      const entityId = 5;
      const changes = { indication: "Updated" };

      vi.mocked(db.logAuditAction).mockResolvedValue(undefined);

      await db.logAuditAction(adminId, action, entityType, entityId, changes);

      expect(db.logAuditAction).toHaveBeenCalledWith(
        adminId,
        action,
        entityType,
        entityId,
        changes
      );
    });

    it("should log actions without entity ID", async () => {
      const adminId = 1;
      const action = "UPDATE_SETTING";
      const entityType = "systemSetting";

      vi.mocked(db.logAuditAction).mockResolvedValue(undefined);

      await db.logAuditAction(adminId, action, entityType);

      expect(db.logAuditAction).toHaveBeenCalledWith(
        adminId,
        action,
        entityType
      );
    });
  });
});
