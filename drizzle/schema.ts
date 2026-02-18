import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
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

// Medications table
export const medications = mysqlTable("medications", {
  id: int("id").autoincrement().primaryKey(),
  scientificName: text("scientificName").notNull(),
  tradeNames: text("tradeNames").notNull(), // JSON array as string
  indication: text("indication"),
  icdCodes: text("icdCodes").notNull(), // JSON array as string
  coverageStatus: varchar("coverageStatus", { length: 50 }).default("COVERED").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Conditions table
export const conditions = mysqlTable("conditions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  relatedMedications: text("relatedMedications").notNull(), // JSON array as string
  relatedCodes: text("relatedCodes").notNull(), // JSON array as string
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// ICD-10 Codes table
export const codes = mysqlTable("codes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  description: text("description").notNull(),
  branches: text("branches").notNull(), // JSON array as string
  relatedMedications: text("relatedMedications").notNull(), // JSON array as string
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// Non-Covered Codes table
export const nonCoveredCodes = mysqlTable("nonCoveredCodes", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  description: text("description").notNull(),
  branches: text("branches").notNull(), // JSON array as string
  relatedMedications: text("relatedMedications").notNull(), // JSON array as string
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Medication = typeof medications.$inferSelect;
export type InsertMedication = typeof medications.$inferInsert;
export type Condition = typeof conditions.$inferSelect;
export type InsertCondition = typeof conditions.$inferInsert;
export type Code = typeof codes.$inferSelect;
export type InsertCode = typeof codes.$inferInsert;
export type NonCoveredCode = typeof nonCoveredCodes.$inferSelect;
export type InsertNonCoveredCode = typeof nonCoveredCodes.$inferInsert;

// Search Analytics table
export const searchAnalytics = mysqlTable("searchAnalytics", {
  id: int("id").autoincrement().primaryKey(),
  query: varchar("query", { length: 255 }).notNull(),
  resultsCount: int("resultsCount").default(0).notNull(),
  responseTime: int("responseTime").default(0).notNull(),
  userId: int("userId"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// User Sessions table
export const userSessions = mysqlTable("userSessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  sessionStart: timestamp("sessionStart").defaultNow().notNull(),
  sessionEnd: timestamp("sessionEnd"),
  isActive: boolean("isActive").default(true),
});

export type SearchAnalytic = typeof searchAnalytics.$inferSelect;
export type InsertSearchAnalytic = typeof searchAnalytics.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;
