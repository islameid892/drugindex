import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  index,
  boolean,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// ─── Users ─────────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Drug Entries ──────────────────────────────────────────────────────────────
// Each row from the Excel file becomes one entry.
// One entry = one (scientific_name, trade_name, indication, icd_codes) combination.

export const drugEntries = mysqlTable(
  "drug_entries",
  {
    id: int("id").autoincrement().primaryKey(),
    scientificName: varchar("scientific_name", { length: 500 }).notNull(),
    tradeName: varchar("trade_name", { length: 500 }).notNull(),
    indication: varchar("indication", { length: 500 }).notNull(),
    // Raw ICD codes string from Excel, e.g. "E11, E28, O24"
    icdCodesRaw: varchar("icd_codes_raw", { length: 1000 }).notNull().default(""),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    sciNameIdx: index("idx_drug_sci_name").on(t.scientificName),
    tradeNameIdx: index("idx_drug_trade_name").on(t.tradeName),
    indicationIdx: index("idx_drug_indication").on(t.indication),
  })
);

export type DrugEntry = typeof drugEntries.$inferSelect;
export type InsertDrugEntry = typeof drugEntries.$inferInsert;

// Junction: drug_entries ↔ icd_codes (Many-to-Many)
// Links each drug entry to its parsed ICD codes
export const drugEntryCodes = mysqlTable(
  "drug_entry_codes",
  {
    id: int("id").autoincrement().primaryKey(),
    drugEntryId: int("drug_entry_id")
      .notNull()
      .references(() => drugEntries.id, { onDelete: "cascade", onUpdate: "cascade" }),
    codeId: int("code_id")
      .notNull()
      .references(() => icdCodes.id, { onDelete: "cascade", onUpdate: "cascade" }),
  },
  (t) => ({
    drugEntryIdx: index("idx_dec_drug_entry_id").on(t.drugEntryId),
    codeIdx: index("idx_dec_code_id").on(t.codeId),
  })
);

export type DrugEntryCode = typeof drugEntryCodes.$inferSelect;

// ─── ICD-10 Codes ──────────────────────────────────────────────────────────────

export const icdCodes = mysqlTable(
  "icd_codes",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 20 }).notNull().unique(),
    description: text("description").notNull(),
    branchCount: int("branch_count").notNull().default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => ({
    codeIdx: index("idx_icd_codes_code").on(t.code),
  })
);

export const icdBranches = mysqlTable(
  "icd_branches",
  {
    id: int("id").autoincrement().primaryKey(),
    parentCodeId: int("parent_code_id")
      .notNull()
      .references(() => icdCodes.id, { onDelete: "cascade", onUpdate: "cascade" }),
    branchCode: varchar("branch_code", { length: 20 }).notNull(),
    branchDescription: text("branch_description").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    parentIdx: index("idx_icd_branches_parent").on(t.parentCodeId),
    branchCodeIdx: index("idx_icd_branches_code").on(t.branchCode),
  })
);

export type IcdCode = typeof icdCodes.$inferSelect;
export type InsertIcdCode = typeof icdCodes.$inferInsert;
export type IcdBranch = typeof icdBranches.$inferSelect;
export type InsertIcdBranch = typeof icdBranches.$inferInsert;

// ─── Non-Covered Codes ─────────────────────────────────────────────────────────

export const nonCoveredCodes = mysqlTable(
  "non_covered_codes",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 20 }).notNull().unique(),
    description: text("description").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    codeIdx: index("idx_non_covered_code").on(t.code),
  })
);

export type NonCoveredCode = typeof nonCoveredCodes.$inferSelect;
export type InsertNonCoveredCode = typeof nonCoveredCodes.$inferInsert;

// ─── Search Analytics ──────────────────────────────────────────────────────────

export const searchAnalytics = mysqlTable(
  "search_analytics",
  {
    id: int("id").autoincrement().primaryKey(),
    query: varchar("query", { length: 500 }).notNull(),
    resultsCount: int("results_count").notNull().default(0),
    searchType: varchar("search_type", { length: 50 }).notNull().default("general"),
    responseTimeMs: int("response_time_ms").notNull().default(0),
    userId: int("user_id").references(() => users.id, { onDelete: "set null" }),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    queryIdx: index("idx_search_analytics_query").on(t.query),
    createdAtIdx: index("idx_search_analytics_created").on(t.createdAt),
    userIdIdx: index("idx_search_analytics_user").on(t.userId),
  })
);

export type SearchAnalytic = typeof searchAnalytics.$inferSelect;
export type InsertSearchAnalytic = typeof searchAnalytics.$inferInsert;

// ─── User Sessions ────────────────────────────────────────────────────────────────
// Track active user sessions for real-time active users count

export const userSessions = mysqlTable(
  "user_sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    sessionId: varchar("session_id", { length: 128 }).notNull().unique(),
    userId: int("user_id").references(() => users.id, { onDelete: "cascade" }),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    sessionIdIdx: index("idx_user_sessions_session").on(t.sessionId),
    userIdIdx: index("idx_user_sessions_user").on(t.userId),
    lastSeenAtIdx: index("idx_user_sessions_last_seen").on(t.lastSeenAt),
  })
);

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;

// ─── Relations ─────────────────────────────────────────────────────────────────

export const drugEntriesRelations = relations(drugEntries, ({ many }) => ({
  codes: many(drugEntryCodes),
}));

export const drugEntryCodesRelations = relations(drugEntryCodes, ({ one }) => ({
  drugEntry: one(drugEntries, {
    fields: [drugEntryCodes.drugEntryId],
    references: [drugEntries.id],
  }),
  code: one(icdCodes, {
    fields: [drugEntryCodes.codeId],
    references: [icdCodes.id],
  }),
}));

export const icdCodesRelations = relations(icdCodes, ({ many }) => ({
  branches: many(icdBranches),
  drugEntryCodes: many(drugEntryCodes),
}));

export const icdBranchesRelations = relations(icdBranches, ({ one }) => ({
  parentCode: one(icdCodes, {
    fields: [icdBranches.parentCodeId],
    references: [icdCodes.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  searchAnalytics: many(searchAnalytics),
}));

export const searchAnalyticsRelations = relations(searchAnalytics, ({ one }) => ({
  user: one(users, {
    fields: [searchAnalytics.userId],
    references: [users.id],
  }),
}));
