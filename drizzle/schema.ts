import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  index,
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
      .references(() => icdCodes.id, { onDelete: "cascade" }),
    branchCode: varchar("branch_code", { length: 20 }).notNull(),
    branchDescription: text("branch_description").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    parentIdx: index("idx_icd_branches_parent").on(t.parentCodeId),
    branchCodeIdx: index("idx_icd_branches_code").on(t.branchCode),
  })
);

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

// ─── Medications ───────────────────────────────────────────────────────────────

export const medications = mysqlTable(
  "medications",
  {
    id: int("id").autoincrement().primaryKey(),
    scientificName: varchar("scientific_name", { length: 500 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => ({
    sciNameIdx: index("idx_medications_sci_name").on(t.scientificName),
  })
);

export const medicationTradeNames = mysqlTable(
  "medication_trade_names",
  {
    id: int("id").autoincrement().primaryKey(),
    medicationId: int("medication_id")
      .notNull()
      .references(() => medications.id, { onDelete: "cascade" }),
    tradeName: varchar("trade_name", { length: 500 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    medIdx: index("idx_trade_names_med_id").on(t.medicationId),
    tradeNameIdx: index("idx_trade_names_name").on(t.tradeName),
  })
);

export const medicationIndications = mysqlTable(
  "medication_indications",
  {
    id: int("id").autoincrement().primaryKey(),
    medicationId: int("medication_id")
      .notNull()
      .references(() => medications.id, { onDelete: "cascade" }),
    indication: varchar("indication", { length: 500 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    medIdx: index("idx_indications_med_id").on(t.medicationId),
    indicationIdx: index("idx_indications_text").on(t.indication),
  })
);

// Junction: medications ↔ icd_codes (Many-to-Many)
export const medicationCodes = mysqlTable(
  "medication_codes",
  {
    id: int("id").autoincrement().primaryKey(),
    medicationId: int("medication_id")
      .notNull()
      .references(() => medications.id, { onDelete: "cascade" }),
    codeId: int("code_id")
      .notNull()
      .references(() => icdCodes.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    medIdx: index("idx_med_codes_med_id").on(t.medicationId),
    codeIdx: index("idx_med_codes_code_id").on(t.codeId),
  })
);

// ─── Search Analytics ──────────────────────────────────────────────────────────

export const searchAnalytics = mysqlTable(
  "search_analytics",
  {
    id: int("id").autoincrement().primaryKey(),
    query: varchar("query", { length: 500 }).notNull(),
    resultsCount: int("results_count").notNull().default(0),
    searchType: varchar("search_type", { length: 50 }).notNull().default("general"),
    userId: int("user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    queryIdx: index("idx_search_analytics_query").on(t.query),
    createdAtIdx: index("idx_search_analytics_created").on(t.createdAt),
  })
);

// ─── Relations ─────────────────────────────────────────────────────────────────

export const icdCodesRelations = relations(icdCodes, ({ many }) => ({
  branches: many(icdBranches),
  medicationCodes: many(medicationCodes),
}));

export const icdBranchesRelations = relations(icdBranches, ({ one }) => ({
  parentCode: one(icdCodes, {
    fields: [icdBranches.parentCodeId],
    references: [icdCodes.id],
  }),
}));

export const medicationsRelations = relations(medications, ({ many }) => ({
  tradeNames: many(medicationTradeNames),
  indications: many(medicationIndications),
  medicationCodes: many(medicationCodes),
}));

export const medicationTradeNamesRelations = relations(medicationTradeNames, ({ one }) => ({
  medication: one(medications, {
    fields: [medicationTradeNames.medicationId],
    references: [medications.id],
  }),
}));

export const medicationIndicationsRelations = relations(medicationIndications, ({ one }) => ({
  medication: one(medications, {
    fields: [medicationIndications.medicationId],
    references: [medications.id],
  }),
}));

export const medicationCodesRelations = relations(medicationCodes, ({ one }) => ({
  medication: one(medications, {
    fields: [medicationCodes.medicationId],
    references: [medications.id],
  }),
  code: one(icdCodes, {
    fields: [medicationCodes.codeId],
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

// ─── Types ─────────────────────────────────────────────────────────────────────

export type IcdCode = typeof icdCodes.$inferSelect;
export type InsertIcdCode = typeof icdCodes.$inferInsert;
export type IcdBranch = typeof icdBranches.$inferSelect;
export type InsertIcdBranch = typeof icdBranches.$inferInsert;
export type NonCoveredCode = typeof nonCoveredCodes.$inferSelect;
export type InsertNonCoveredCode = typeof nonCoveredCodes.$inferInsert;
export type Medication = typeof medications.$inferSelect;
export type InsertMedication = typeof medications.$inferInsert;
export type MedicationTradeName = typeof medicationTradeNames.$inferSelect;
export type MedicationIndication = typeof medicationIndications.$inferSelect;
export type MedicationCode = typeof medicationCodes.$inferSelect;
export type SearchAnalytic = typeof searchAnalytics.$inferSelect;
export type InsertSearchAnalytic = typeof searchAnalytics.$inferInsert;
