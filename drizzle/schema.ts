import { 
  int, 
  mysqlEnum, 
  mysqlTable, 
  text, 
  timestamp, 
  varchar, 
  boolean,
  index,
  unique,
  foreignKey
} from "drizzle-orm/mysql-core";

/**
 * Optimized Database Schema with Foreign Keys and Relationships
 * All data is normalized with proper relationships
 * No static JSON files - all data served from database
 */

// ============================================================================
// USERS TABLE
// ============================================================================
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
}, (table) => ({
  openIdIdx: index("openId_idx").on(table.openId),
  emailIdx: index("email_idx").on(table.email),
}));

// ============================================================================
// ICD-10 CODES TABLE (Main codes)
// ============================================================================
export const codes = mysqlTable("codes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  description: text("description").notNull(),
  parentCodeId: int("parentCodeId"), // For hierarchical structure
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  codeIdx: index("code_idx").on(table.code),
  parentCodeIdx: index("parentCodeId_idx").on(table.parentCodeId),
  parentCodeFk: foreignKey({
    columns: [table.parentCodeId],
    foreignColumns: [table.id],
    name: "codes_parentCodeId_fk"
  }).onDelete("cascade"),
}));

// ============================================================================
// CODE BRANCHES TABLE (Sub-codes)
// ============================================================================
export const codeBranches = mysqlTable("codeBranches", {
  id: int("id").autoincrement().primaryKey(),
  parentCodeId: int("parentCodeId").notNull(),
  branchCode: varchar("branchCode", { length: 20 }).notNull(),
  branchDescription: text("branchDescription").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  parentCodeFk: foreignKey({
    columns: [table.parentCodeId],
    foreignColumns: [codes.id],
    name: "codeBranches_parentCodeId_fk"
  }).onDelete("cascade"),
  branchCodeIdx: index("branchCode_idx").on(table.branchCode),
  parentCodeIdx: index("codeBranches_parentCodeId_idx").on(table.parentCodeId),
  uniqueBranch: unique("unique_branch").on(table.parentCodeId, table.branchCode),
}));

// ============================================================================
// MEDICATIONS TABLE
// ============================================================================
export const medications = mysqlTable("medications", {
  id: int("id").autoincrement().primaryKey(),
  scientificName: text("scientificName").notNull(),
  coverageStatus: varchar("coverageStatus", { length: 50 }).default("COVERED").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  scientificNameIdx: index("scientificName_idx").on(table.scientificName),
  coverageStatusIdx: index("coverageStatus_idx").on(table.coverageStatus),
}));

// ============================================================================
// MEDICATION TRADE NAMES TABLE (One medication can have multiple trade names)
// ============================================================================
export const medicationTradeNames = mysqlTable("medicationTradeNames", {
  id: int("id").autoincrement().primaryKey(),
  medicationId: int("medicationId").notNull(),
  tradeName: varchar("tradeName", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  medicationFk: foreignKey({
    columns: [table.medicationId],
    foreignColumns: [medications.id],
    name: "medicationTradeNames_medicationId_fk"
  }).onDelete("cascade"),
  medicationIdx: index("medicationTradeNames_medicationId_idx").on(table.medicationId),
  tradeNameIdx: index("tradeName_idx").on(table.tradeName),
  uniqueTradeName: unique("unique_tradeName").on(table.medicationId, table.tradeName),
}));

// ============================================================================
// MEDICATION INDICATIONS TABLE (One medication can have multiple indications)
// ============================================================================
export const medicationIndications = mysqlTable("medicationIndications", {
  id: int("id").autoincrement().primaryKey(),
  medicationId: int("medicationId").notNull(),
  indication: text("indication").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  medicationFk: foreignKey({
    columns: [table.medicationId],
    foreignColumns: [medications.id],
    name: "medicationIndications_medicationId_fk"
  }).onDelete("cascade"),
  medicationIdx: index("medicationIndications_medicationId_idx").on(table.medicationId),
}));

// ============================================================================
// MEDICATION-CODE JUNCTION TABLE (Many-to-Many relationship)
// ============================================================================
export const medicationCodes = mysqlTable("medicationCodes", {
  id: int("id").autoincrement().primaryKey(),
  medicationId: int("medicationId").notNull(),
  codeId: int("codeId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  medicationFk: foreignKey({
    columns: [table.medicationId],
    foreignColumns: [medications.id],
    name: "medicationCodes_medicationId_fk"
  }).onDelete("cascade"),
  codeFk: foreignKey({
    columns: [table.codeId],
    foreignColumns: [codes.id],
    name: "medicationCodes_codeId_fk"
  }).onDelete("cascade"),
  medicationIdx: index("medicationCodes_medicationId_idx").on(table.medicationId),
  codeIdx: index("medicationCodes_codeId_idx").on(table.codeId),
  uniqueMedicationCode: unique("unique_medicationCode").on(table.medicationId, table.codeId),
}));

// ============================================================================
// CONDITIONS TABLE
// ============================================================================
export const conditions = mysqlTable("conditions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  nameIdx: index("condition_name_idx").on(table.name),
}));

// ============================================================================
// CONDITION-CODE JUNCTION TABLE (Many-to-Many relationship)
// ============================================================================
export const conditionCodes = mysqlTable("conditionCodes", {
  id: int("id").autoincrement().primaryKey(),
  conditionId: int("conditionId").notNull(),
  codeId: int("codeId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  conditionFk: foreignKey({
    columns: [table.conditionId],
    foreignColumns: [conditions.id],
    name: "conditionCodes_conditionId_fk"
  }).onDelete("cascade"),
  codeFk: foreignKey({
    columns: [table.codeId],
    foreignColumns: [codes.id],
    name: "conditionCodes_codeId_fk"
  }).onDelete("cascade"),
  conditionIdx: index("conditionCodes_conditionId_idx").on(table.conditionId),
  codeIdx: index("conditionCodes_codeId_idx").on(table.codeId),
  uniqueConditionCode: unique("unique_conditionCode").on(table.conditionId, table.codeId),
}));

// ============================================================================
// CONDITION-MEDICATION JUNCTION TABLE (Many-to-Many relationship)
// ============================================================================
export const conditionMedications = mysqlTable("conditionMedications", {
  id: int("id").autoincrement().primaryKey(),
  conditionId: int("conditionId").notNull(),
  medicationId: int("medicationId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  conditionFk: foreignKey({
    columns: [table.conditionId],
    foreignColumns: [conditions.id],
    name: "conditionMedications_conditionId_fk"
  }).onDelete("cascade"),
  medicationFk: foreignKey({
    columns: [table.medicationId],
    foreignColumns: [medications.id],
    name: "conditionMedications_medicationId_fk"
  }).onDelete("cascade"),
  conditionIdx: index("conditionMedications_conditionId_idx").on(table.conditionId),
  medicationIdx: index("conditionMedications_medicationId_idx").on(table.medicationId),
  uniqueConditionMedication: unique("unique_conditionMedication").on(table.conditionId, table.medicationId),
}));

// ============================================================================
// NON-COVERED CODES TABLE
// ============================================================================
export const nonCoveredCodes = mysqlTable("nonCoveredCodes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  description: text("description").notNull(),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  codeIdx: index("nonCoveredCode_idx").on(table.code),
}));

// ============================================================================
// SEARCH ANALYTICS TABLE
// ============================================================================
export const searchAnalytics = mysqlTable("searchAnalytics", {
  id: int("id").autoincrement().primaryKey(),
  query: varchar("query", { length: 255 }).notNull(),
  resultsCount: int("resultsCount").default(0).notNull(),
  responseTime: int("responseTime").default(0).notNull(),
  userId: int("userId"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  userFk: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "searchAnalytics_userId_fk"
  }).onDelete("set null"),
  userIdx: index("searchAnalytics_userId_idx").on(table.userId),
  queryIdx: index("query_idx").on(table.query),
  timestampIdx: index("timestamp_idx").on(table.timestamp),
}));

// ============================================================================
// USER SESSIONS TABLE
// ============================================================================
export const userSessions = mysqlTable("userSessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sessionStart: timestamp("sessionStart").defaultNow().notNull(),
  sessionEnd: timestamp("sessionEnd"),
  isActive: boolean("isActive").default(true),
}, (table) => ({
  userFk: foreignKey({
    columns: [table.userId],
    foreignColumns: [users.id],
    name: "userSessions_userId_fk"
  }).onDelete("cascade"),
  userIdx: index("userSessions_userId_idx").on(table.userId),
  isActiveIdx: index("isActive_idx").on(table.isActive),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Code = typeof codes.$inferSelect;
export type InsertCode = typeof codes.$inferInsert;

export type CodeBranch = typeof codeBranches.$inferSelect;
export type InsertCodeBranch = typeof codeBranches.$inferInsert;

export type Medication = typeof medications.$inferSelect;
export type InsertMedication = typeof medications.$inferInsert;

export type MedicationTradeName = typeof medicationTradeNames.$inferSelect;
export type InsertMedicationTradeName = typeof medicationTradeNames.$inferInsert;

export type MedicationIndication = typeof medicationIndications.$inferSelect;
export type InsertMedicationIndication = typeof medicationIndications.$inferInsert;

export type MedicationCode = typeof medicationCodes.$inferSelect;
export type InsertMedicationCode = typeof medicationCodes.$inferInsert;

export type Condition = typeof conditions.$inferSelect;
export type InsertCondition = typeof conditions.$inferInsert;

export type ConditionCode = typeof conditionCodes.$inferSelect;
export type InsertConditionCode = typeof conditionCodes.$inferInsert;

export type ConditionMedication = typeof conditionMedications.$inferSelect;
export type InsertConditionMedication = typeof conditionMedications.$inferInsert;

export type NonCoveredCode = typeof nonCoveredCodes.$inferSelect;
export type InsertNonCoveredCode = typeof nonCoveredCodes.$inferInsert;

export type SearchAnalytic = typeof searchAnalytics.$inferSelect;
export type InsertSearchAnalytic = typeof searchAnalytics.$inferInsert;

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;
