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
    imageUrl: varchar("image_url", { length: 1000 }),
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
// Links non-covered codes to their corresponding ICD-10 codes and branches
// This ensures data synchronization when icd_codes or icd_branches are updated

export const nonCoveredCodes = mysqlTable(
  "non_covered_codes",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 20 }).notNull().unique(),
    description: text("description").notNull(),
    // Foreign key to icd_codes (for main codes like E11, F10, etc.)
    icdCodeId: int("icd_code_id").references(() => icdCodes.id, { onDelete: "set null", onUpdate: "cascade" }),
    // Foreign key to icd_branches (for branch codes like E11.1, F10.2, etc.)
    icdBranchId: int("icd_branch_id").references(() => icdBranches.id, { onDelete: "set null", onUpdate: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    codeIdx: index("idx_non_covered_code").on(t.code),
    icdCodeIdIdx: index("idx_non_covered_icd_code").on(t.icdCodeId),
    icdBranchIdIdx: index("idx_non_covered_icd_branch").on(t.icdBranchId),
  })
);

export type NonCoveredCode = typeof nonCoveredCodes.$inferSelect;
export type InsertNonCoveredCode = typeof nonCoveredCodes.$inferInsert;

// Relations for non-covered codes
export const nonCoveredCodesRelations = relations(nonCoveredCodes, ({ one }) => ({
  icdCode: one(icdCodes, {
    fields: [nonCoveredCodes.icdCodeId],
    references: [icdCodes.id],
  }),
  icdBranch: one(icdBranches, {
    fields: [nonCoveredCodes.icdBranchId],
    references: [icdBranches.id],
  }),
}));

// ─── Search Analytics ──────────────────────────────────────────────────────────

export const searchAnalytics = mysqlTable(
  "search_analytics",
  {
    id: int("id").autoincrement().primaryKey(),
    query: varchar("query", { length: 500 }).notNull(),
    resultsCount: int("results_count").notNull().default(0),
    searchType: varchar("search_type", { length: 50 }).notNull().default("general"),
    source: varchar("source", { length: 50 }).notNull().default("main"),
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
    createdAtIdx: index("idx_user_sessions_created").on(t.createdAt),
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


// ─── Drug Lens Database (Separate from drug_entries) ──────────────────────────
// Comprehensive drug reference with detailed pharmaceutical information
// 8000+ drugs with dosages, interactions, pregnancy categories, etc.

export const drugLens = mysqlTable(
  "drug_lens",
  {
    id: int("id").autoincrement().primaryKey(),
    scientificName: varchar("scientific_name", { length: 500 }).notNull(),
    tradeName: varchar("trade_name", { length: 500 }).notNull(),
    form: varchar("form", { length: 100 }), // Pharmaceutical form: tablet, capsule, injection, suppository, etc.
    price: varchar("price", { length: 100 }),
    pharmacologicalAction: text("pharmacological_action"),
    blackBoxWarning: text("black_box_warning"),
    uses: text("uses"),
    pregnancyCategory: varchar("pregnancy_category", { length: 50 }),
    standardDose: text("standard_dose"),
    adjustedDose: text("adjusted_dose"),
    neonatalDose: text("neonatal_dose"),
    doseSource: text("dose_source"),
    contraindicatedInteractions: text("contraindicated_interactions"),
    majorInteractions: text("major_interactions"),
    moderateInteractions: text("moderate_interactions"),
    minorInteractions: text("minor_interactions"),
    imageUrl: varchar("image_url", { length: 1000 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => ({
    sciNameIdx: index("idx_drug_lens_sci_name").on(t.scientificName),
    tradeNameIdx: index("idx_drug_lens_trade_name").on(t.tradeName),
    formIdx: index("idx_drug_lens_form").on(t.form),
  })
);

export type DrugLens = typeof drugLens.$inferSelect;
export type InsertDrugLens = typeof drugLens.$inferInsert;

// Feature Usage Tracking - Track clicks on call-to-action buttons

export const featureUsageTracking = mysqlTable(
  "feature_usage_tracking",
  {
    id: int("id").autoincrement().primaryKey(),
    featureName: varchar("feature_name", { length: 100 }).notNull(),
    sessionId: varchar("session_id", { length: 128 }),
    userId: int("user_id").references(() => users.id, { onDelete: "set null" }),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    referrer: varchar("referrer", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    featureNameIdx: index("idx_feature_usage_feature").on(t.featureName),
    sessionIdIdx: index("idx_feature_usage_session").on(t.sessionId),
    userIdIdx: index("idx_feature_usage_user").on(t.userId),
    createdAtIdx: index("idx_feature_usage_created").on(t.createdAt),
  })
);

export type FeatureUsageTracking = typeof featureUsageTracking.$inferSelect;
export type InsertFeatureUsageTracking = typeof featureUsageTracking.$inferInsert;

// ─── Bupa Prerequisites ────────────────────────────────────────────────────────
// Medical services and their prerequisites for Bupa insurance coverage

export const bupaPrerequisites = mysqlTable(
  "bupa_prerequisites",
  {
    id: int("id").autoincrement().primaryKey(),
    serviceName: varchar("service_name", { length: 255 }).notNull(),
    icdCodes: varchar("icd_codes", { length: 500 }).notNull(), // Comma-separated ICD-10 codes
    requirements: text("requirements").notNull(), // Detailed requirements/prerequisites
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (t) => ({
    serviceNameIdx: index("idx_bupa_service_name").on(t.serviceName),
    icdCodesIdx: index("idx_bupa_icd_codes").on(t.icdCodes),
  })
);

export type BupaPrerequisite = typeof bupaPrerequisites.$inferSelect;
export type InsertBupaPrerequisite = typeof bupaPrerequisites.$inferInsert;

// ─── Bupa Prerequisites ICD Code Linking ────────────────────────────────────
// Junction table linking bupa_prerequisites to icd_codes (Many-to-Many)
// Each Bupa service can have multiple ICD codes

export const bupaPrerequisiteCodes = mysqlTable(
  "bupa_prerequisite_codes",
  {
    id: int("id").autoincrement().primaryKey(),
    bupaPrerequisiteId: int("bupa_prerequisite_id")
      .notNull()
      .references(() => bupaPrerequisites.id, { onDelete: "cascade", onUpdate: "cascade" }),
    icdCodeId: int("icd_code_id")
      .notNull()
      .references(() => icdCodes.id, { onDelete: "cascade", onUpdate: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    bupaPrereqIdx: index("idx_bupa_prereq_id").on(t.bupaPrerequisiteId),
    icdCodeIdx: index("idx_bupa_icd_code_id").on(t.icdCodeId),
  })
);

export type BupaPrerequisiteCode = typeof bupaPrerequisiteCodes.$inferSelect;
export type InsertBupaPrerequisiteCode = typeof bupaPrerequisiteCodes.$inferInsert;

// ─── Bupa Code Branches ────────────────────────────────────────────────────
// Links bupa_prerequisite_codes to icd_branches for detailed branch information
// Allows showing all sub-codes/branches for each ICD code in a Bupa service

export const bupaCodeBranches = mysqlTable(
  "bupa_code_branches",
  {
    id: int("id").autoincrement().primaryKey(),
    bupaCodeId: int("bupa_code_id")
      .notNull()
      .references(() => bupaPrerequisiteCodes.id, { onDelete: "cascade", onUpdate: "cascade" }),
    icdBranchId: int("icd_branch_id")
      .notNull()
      .references(() => icdBranches.id, { onDelete: "cascade", onUpdate: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    bupaCodeIdx: index("idx_bupa_code_branch_bupa_code").on(t.bupaCodeId),
    icdBranchIdx: index("idx_bupa_code_branch_icd_branch").on(t.icdBranchId),
  })
);

export type BupaCodeBranch = typeof bupaCodeBranches.$inferSelect;
export type InsertBupaCodeBranch = typeof bupaCodeBranches.$inferInsert;

// ─── Relations for Bupa Prerequisites ───────────────────────────────────────

export const bupaPrerequisitesRelations = relations(bupaPrerequisites, ({ many }) => ({
  codes: many(bupaPrerequisiteCodes),
}));

export const bupaPrerequisiteCodesRelations = relations(bupaPrerequisiteCodes, ({ one, many }) => ({
  bupaPrerequisite: one(bupaPrerequisites, {
    fields: [bupaPrerequisiteCodes.bupaPrerequisiteId],
    references: [bupaPrerequisites.id],
  }),
  icdCode: one(icdCodes, {
    fields: [bupaPrerequisiteCodes.icdCodeId],
    references: [icdCodes.id],
  }),
  branches: many(bupaCodeBranches),
}));

export const bupaCodeBranchesRelations = relations(bupaCodeBranches, ({ one }) => ({
  bupaCode: one(bupaPrerequisiteCodes, {
    fields: [bupaCodeBranches.bupaCodeId],
    references: [bupaPrerequisiteCodes.id],
  }),
  icdBranch: one(icdBranches, {
    fields: [bupaCodeBranches.icdBranchId],
    references: [icdBranches.id],
  }),
}));

// ─── Uploaded Files ────────────────────────────────────────────────────────────
// User-uploaded files stored in S3 with metadata tracking

export const uploadedFiles = mysqlTable(
  "uploaded_files",
  {
    id: int("id").primaryKey().autoincrement(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileSize: int("file_size").notNull(), // in bytes
    fileType: varchar("file_type", { length: 50 }).notNull(), // e.g., 'pdf', 'xlsx', 'docx'
    s3Key: text("s3_key").notNull(), // S3 storage key
    s3Url: text("s3_url").notNull(), // Public S3 URL
    uploadedBy: varchar("uploaded_by", { length: 255 }), // User email or ID
    uploadedAt: timestamp("uploaded_at").defaultNow(),
    downloads: int("downloads").default(0),
    description: text("description"), // Optional file description
    isDeleted: boolean("is_deleted").default(false).notNull(), // Soft delete flag
  },
  (table) => ({
    uploadedAtIdx: index("idx_uploaded_files_uploaded_at").on(table.uploadedAt),
    uploadedByIdx: index("idx_uploaded_files_uploaded_by").on(table.uploadedBy),
    fileTypeIdx: index("idx_uploaded_files_file_type").on(table.fileType),
  })
);