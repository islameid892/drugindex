import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { bupaRouter } from "./bupa";
import { getDb } from "../db";
import { bupaPrerequisites } from "../../drizzle/schema";

describe("Bupa Router", () => {
  let testData = {
    serviceName: "Test Service",
    icdCodes: "E11, E10, O24",
    requirements: "Test requirements for the service",
  };

  beforeAll(async () => {
    // Insert test data
    const db = await getDb();
    await db.insert(bupaPrerequisites).values(testData);
  });

  afterAll(async () => {
    // Clean up test data
    const db = await getDb();
    await db
      .delete(bupaPrerequisites)
      .where((col: any) => col.serviceName === testData.serviceName);
  });

  it("should get all prerequisites", async () => {
    const caller = bupaRouter.createCaller({} as any);
    const result = await caller.getAll();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("should search prerequisites by service name", async () => {
    const caller = bupaRouter.createCaller({} as any);
    const result = await caller.search({ query: "Test" });
    expect(Array.isArray(result)).toBe(true);
    expect(result.some((item: any) => item.serviceName === testData.serviceName)).toBe(true);
  });

  it("should search prerequisites by ICD code", async () => {
    const caller = bupaRouter.createCaller({} as any);
    const result = await caller.getByIcdCode({ icdCode: "E11" });
    expect(Array.isArray(result)).toBe(true);
    expect(result.some((item: any) => item.icdCodes.includes("E11"))).toBe(true);
  });

  it("should get prerequisites by service name", async () => {
    const caller = bupaRouter.createCaller({} as any);
    const result = await caller.getByServiceName({ serviceName: "Test" });
    expect(Array.isArray(result)).toBe(true);
    expect(result.some((item: any) => item.serviceName === testData.serviceName)).toBe(true);
  });

  it("should get count of prerequisites", async () => {
    const caller = bupaRouter.createCaller({} as any);
    const count = await caller.getCount();
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThan(0);
  });

  it("should return null for non-existent prerequisite", async () => {
    const caller = bupaRouter.createCaller({} as any);
    const result = await caller.getById({ id: 999999 });
    expect(result).toBeNull();
  });
});
