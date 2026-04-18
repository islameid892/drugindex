import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import mysql from "mysql2/promise";

// Allowed tables for security
const ALLOWED_TABLES = [
  "drug_entries",
  "icd_codes",
  "icd_branches",
  "contact_messages",
  "search_analytics",
  "users",
];

// Dangerous keywords to block
const DANGEROUS_KEYWORDS = [
  "DROP",
  "DELETE",
  "TRUNCATE",
  "ALTER",
  "CREATE",
  "INSERT",
  "UPDATE",
  "EXEC",
  "EXECUTE",
];

/**
 * Validate SQL query for safety
 */
function validateQuery(query: string): { valid: boolean; error?: string } {
  const upperQuery = query.toUpperCase().trim();

  // Check for dangerous keywords
  for (const keyword of DANGEROUS_KEYWORDS) {
    if (upperQuery.includes(keyword)) {
      return {
        valid: false,
        error: `Query contains dangerous keyword: ${keyword}. Only SELECT queries are allowed.`,
      };
    }
  }

  // Must be a SELECT query
  if (!upperQuery.startsWith("SELECT")) {
    return {
      valid: false,
      error: "Only SELECT queries are allowed. No modifications permitted.",
    };
  }

  // Check for allowed tables
  let hasAllowedTable = false;
  for (const table of ALLOWED_TABLES) {
    if (upperQuery.includes(table.toUpperCase())) {
      hasAllowedTable = true;
      break;
    }
  }

  if (!hasAllowedTable) {
    return {
      valid: false,
      error: `Query must reference one of these tables: ${ALLOWED_TABLES.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Get raw MySQL connection for direct queries
 */
async function getRawConnection() {
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL!,
    connectionLimit: 1,
    waitForConnections: true,
    queueLimit: 0,
  });
  return pool.getConnection();
}

export const sqlQueryRouter = router({
  /**
   * Execute a read-only SQL query
   * Only admins can use this
   */
  executeQuery: protectedProcedure
    .input(
      z.object({
        query: z.string().min(5).max(5000),
        limit: z.number().min(1).max(1000).default(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can execute SQL queries",
        });
      }

      // Validate query
      const validation = validateQuery(input.query);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.error || "Invalid query",
        });
      }

      try {
        const connection = await getRawConnection();

        try {
          // Add LIMIT if not present
          let finalQuery = input.query;
          if (!finalQuery.toUpperCase().includes("LIMIT")) {
            finalQuery += ` LIMIT ${input.limit}`;
          }

          const [rows] = await connection.execute(finalQuery);

          return {
            success: true,
            rows: rows as any[],
            rowCount: (rows as any[]).length,
            query: finalQuery,
          };
        } finally {
          connection.release();
        }
      } catch (error: any) {
        console.error("SQL Query Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Database error: ${error.message}`,
        });
      }
    }),

  /**
   * Get table statistics
   */
  getTableStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only admins can view table statistics",
      });
    }

    try {
      const connection = await getRawConnection();

      try {
        const stats: Record<string, any> = {};

        for (const table of ALLOWED_TABLES) {
          const [countResult] = await connection.execute(
            `SELECT COUNT(*) as count FROM ${table}`
          );
          const count = (countResult as any)[0]?.count || 0;
          stats[table] = { count };
        }

        return { success: true, stats };
      } finally {
        connection.release();
      }
    } catch (error: any) {
      console.error("Table Stats Error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Error fetching table statistics: ${error.message}`,
      });
    }
  }),

  /**
   * Get database schema information
   */
  getSchema: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only admins can view schema information",
      });
    }

    try {
      const connection = await getRawConnection();

      try {
        const schema: Record<string, any> = {};

        for (const table of ALLOWED_TABLES) {
          const [columns] = await connection.execute(
            `DESCRIBE ${table}`
          );
          schema[table] = columns;
        }

        return { success: true, schema };
      } finally {
        connection.release();
      }
    } catch (error: any) {
      console.error("Schema Error:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Error fetching schema: ${error.message}`,
      });
    }
  }),

  /**
   * Get sample queries for quick access
   */
  getSampleQueries: protectedProcedure.query(() => {
    return {
      success: true,
      samples: [
        {
          name: "Total Drugs",
          query: "SELECT COUNT(*) as total FROM drug_entries",
          description: "Get total number of drug entries",
        },
        {
          name: "Total ICD Codes",
          query: "SELECT COUNT(*) as total FROM icd_codes",
          description: "Get total number of ICD codes",
        },
        {
          name: "Recent Search Analytics",
          query:
            "SELECT * FROM search_analytics ORDER BY created_at DESC LIMIT 10",
          description: "Get 10 most recent searches",
        },
        {
          name: "Contact Messages",
          query:
            "SELECT id, name, email, subject, created_at FROM contact_messages ORDER BY created_at DESC LIMIT 20",
          description: "Get recent contact form submissions",
        },
        {
          name: "Registered Users",
          query: "SELECT COUNT(*) as total FROM users",
          description: "Get total number of registered users",
        },
        {
          name: "Drugs by Scientific Name",
          query:
            "SELECT scientific_name, COUNT(*) as count FROM drug_entries GROUP BY scientific_name ORDER BY count DESC LIMIT 20",
          description: "Get top 20 scientific names by drug count",
        },
        {
          name: "ICD Codes by Branch",
          query:
            "SELECT branch_code, COUNT(*) as count FROM icd_codes GROUP BY branch_code ORDER BY count DESC LIMIT 20",
          description: "Get top 20 ICD branches by code count",
        },
        {
          name: "Search Trends",
          query:
            "SELECT search_query, COUNT(*) as count FROM search_analytics GROUP BY search_query ORDER BY count DESC LIMIT 20",
          description: "Get top 20 most searched queries",
        },
      ],
    };
  }),
});
