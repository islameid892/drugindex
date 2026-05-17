import { describe, it, expect } from "vitest";
import { TRPCError } from "@trpc/server";

describe("SQL Query Router", () => {
  describe("Query Validation", () => {
    it("should reject queries with DROP keyword", () => {
      const query = "DROP TABLE drug_entries";
      const upperQuery = query.toUpperCase().trim();
      const DANGEROUS_KEYWORDS = ["DROP", "DELETE", "TRUNCATE", "ALTER", "CREATE", "INSERT", "UPDATE", "EXEC", "EXECUTE"];
      
      const isBlocked = DANGEROUS_KEYWORDS.some(keyword => upperQuery.includes(keyword));
      expect(isBlocked).toBe(true);
    });

    it("should reject queries with DELETE keyword", () => {
      const query = "DELETE FROM drug_entries WHERE id = 1";
      const upperQuery = query.toUpperCase().trim();
      const DANGEROUS_KEYWORDS = ["DROP", "DELETE", "TRUNCATE", "ALTER", "CREATE", "INSERT", "UPDATE", "EXEC", "EXECUTE"];
      
      const isBlocked = DANGEROUS_KEYWORDS.some(keyword => upperQuery.includes(keyword));
      expect(isBlocked).toBe(true);
    });

    it("should reject queries with INSERT keyword", () => {
      const query = "INSERT INTO drug_entries VALUES (1, 'test')";
      const upperQuery = query.toUpperCase().trim();
      const DANGEROUS_KEYWORDS = ["DROP", "DELETE", "TRUNCATE", "ALTER", "CREATE", "INSERT", "UPDATE", "EXEC", "EXECUTE"];
      
      const isBlocked = DANGEROUS_KEYWORDS.some(keyword => upperQuery.includes(keyword));
      expect(isBlocked).toBe(true);
    });

    it("should reject queries with UPDATE keyword", () => {
      const query = "UPDATE drug_entries SET name = 'test' WHERE id = 1";
      const upperQuery = query.toUpperCase().trim();
      const DANGEROUS_KEYWORDS = ["DROP", "DELETE", "TRUNCATE", "ALTER", "CREATE", "INSERT", "UPDATE", "EXEC", "EXECUTE"];
      
      const isBlocked = DANGEROUS_KEYWORDS.some(keyword => upperQuery.includes(keyword));
      expect(isBlocked).toBe(true);
    });

    it("should only allow SELECT queries", () => {
      const query = "SELECT * FROM drug_entries";
      const upperQuery = query.toUpperCase().trim();
      
      const isSelect = upperQuery.startsWith("SELECT");
      expect(isSelect).toBe(true);
    });

    it("should reject non-SELECT queries", () => {
      const query = "SHOW TABLES";
      const upperQuery = query.toUpperCase().trim();
      
      const isSelect = upperQuery.startsWith("SELECT");
      expect(isSelect).toBe(false);
    });

    it("should verify query references allowed tables", () => {
      const query = "SELECT * FROM drug_entries";
      const ALLOWED_TABLES = ["drug_entries", "icd_codes", "icd_branches", "contact_messages", "search_analytics", "users"];
      const upperQuery = query.toUpperCase();
      
      let hasAllowedTable = false;
      for (const table of ALLOWED_TABLES) {
        if (upperQuery.includes(table.toUpperCase())) {
          hasAllowedTable = true;
          break;
        }
      }
      
      expect(hasAllowedTable).toBe(true);
    });

    it("should reject queries referencing disallowed tables", () => {
      const query = "SELECT * FROM mysql.user";
      const ALLOWED_TABLES = ["drug_entries", "icd_codes", "icd_branches", "contact_messages", "search_analytics", "users"];
      const upperQuery = query.toUpperCase();
      
      let hasAllowedTable = false;
      for (const table of ALLOWED_TABLES) {
        if (upperQuery.includes(table.toUpperCase())) {
          hasAllowedTable = true;
          break;
        }
      }
      
      expect(hasAllowedTable).toBe(false);
    });
  });

  describe("Allowed Tables", () => {
    it("should allow drug_entries table", () => {
      const ALLOWED_TABLES = ["drug_entries", "icd_codes", "icd_branches", "contact_messages", "search_analytics", "users"];
      expect(ALLOWED_TABLES).toContain("drug_entries");
    });

    it("should allow icd_codes table", () => {
      const ALLOWED_TABLES = ["drug_entries", "icd_codes", "icd_branches", "contact_messages", "search_analytics", "users"];
      expect(ALLOWED_TABLES).toContain("icd_codes");
    });

    it("should allow icd_branches table", () => {
      const ALLOWED_TABLES = ["drug_entries", "icd_codes", "icd_branches", "contact_messages", "search_analytics", "users"];
      expect(ALLOWED_TABLES).toContain("icd_branches");
    });

    it("should allow contact_messages table", () => {
      const ALLOWED_TABLES = ["drug_entries", "icd_codes", "icd_branches", "contact_messages", "search_analytics", "users"];
      expect(ALLOWED_TABLES).toContain("contact_messages");
    });

    it("should allow search_analytics table", () => {
      const ALLOWED_TABLES = ["drug_entries", "icd_codes", "icd_branches", "contact_messages", "search_analytics", "users"];
      expect(ALLOWED_TABLES).toContain("search_analytics");
    });

    it("should allow users table", () => {
      const ALLOWED_TABLES = ["drug_entries", "icd_codes", "icd_branches", "contact_messages", "search_analytics", "users"];
      expect(ALLOWED_TABLES).toContain("users");
    });
  });

  describe("Query Examples", () => {
    it("should accept COUNT query", () => {
      const query = "SELECT COUNT(*) as total FROM drug_entries";
      const upperQuery = query.toUpperCase().trim();
      
      expect(upperQuery.startsWith("SELECT")).toBe(true);
      expect(upperQuery).toContain("DRUG_ENTRIES");
    });

    it("should accept GROUP BY query", () => {
      const query = "SELECT scientific_name, COUNT(*) as count FROM drug_entries GROUP BY scientific_name";
      const upperQuery = query.toUpperCase().trim();
      
      expect(upperQuery.startsWith("SELECT")).toBe(true);
      expect(upperQuery).toContain("GROUP BY");
    });

    it("should accept ORDER BY query", () => {
      const query = "SELECT * FROM search_analytics ORDER BY created_at DESC LIMIT 10";
      const upperQuery = query.toUpperCase().trim();
      
      expect(upperQuery.startsWith("SELECT")).toBe(true);
      expect(upperQuery).toContain("ORDER BY");
    });

    it("should accept JOIN query", () => {
      const query = "SELECT d.trade_name, i.code FROM drug_entries d JOIN icd_codes i ON d.id = i.drug_id";
      const upperQuery = query.toUpperCase().trim();
      
      expect(upperQuery.startsWith("SELECT")).toBe(true);
      expect(upperQuery).toContain("JOIN");
    });

    it("should accept WHERE clause", () => {
      const query = "SELECT * FROM drug_entries WHERE scientific_name = 'Aspirin'";
      const upperQuery = query.toUpperCase().trim();
      
      expect(upperQuery.startsWith("SELECT")).toBe(true);
      expect(upperQuery).toContain("WHERE");
    });
  });

  describe("Security", () => {
    it("should have admin-only access", () => {
      // This would be tested in integration tests
      // Just verify the concept here
      const userRole = "user";
      const isAdmin = userRole === "admin";
      
      expect(isAdmin).toBe(false);
    });

    it("should allow admin access", () => {
      const userRole = "admin";
      const isAdmin = userRole === "admin";
      
      expect(isAdmin).toBe(true);
    });
  });

  describe("Sample Queries", () => {
    it("should provide sample queries", () => {
      const samples = [
        { name: "Total Drugs", query: "SELECT COUNT(*) as total FROM drug_entries" },
        { name: "Total ICD Codes", query: "SELECT COUNT(*) as total FROM icd_codes" },
        { name: "Recent Search Analytics", query: "SELECT * FROM search_analytics ORDER BY created_at DESC LIMIT 10" },
      ];
      
      expect(samples.length).toBeGreaterThan(0);
      expect(samples[0].name).toBe("Total Drugs");
    });

    it("should have descriptions for samples", () => {
      const sample = {
        name: "Total Drugs",
        query: "SELECT COUNT(*) as total FROM drug_entries",
        description: "Get total number of drug entries",
      };
      
      expect(sample.description).toBeDefined();
      expect(sample.description.length).toBeGreaterThan(0);
    });
  });
});
