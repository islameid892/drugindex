import { describe, it, expect, beforeEach } from "vitest";
import { liveAnalytics } from "./liveAnalytics";

describe("Live Analytics", () => {
  beforeEach(() => {
    liveAnalytics.reset();
  });

  it("should log searches and track them", async () => {
    await liveAnalytics.logSearch("diabetes", 10);
    await liveAnalytics.logSearch("hypertension", 5);
    await liveAnalytics.logSearch("diabetes", 8);

    const snapshot = liveAnalytics.getSnapshot();

    expect(snapshot.totalSearches).toBe(3);
    expect(snapshot.uniqueSearchTerms).toBe(2);
  });

  it("should track top searches", async () => {
    await liveAnalytics.logSearch("diabetes", 10);
    await liveAnalytics.logSearch("diabetes", 8);
    await liveAnalytics.logSearch("panadol", 5);

    const snapshot = liveAnalytics.getSnapshot();
    const topSearches = snapshot.topSearches;

    expect(topSearches[0].term).toBe("diabetes");
    expect(topSearches[0].count).toBe(2);
    expect(topSearches[1].term).toBe("panadol");
    expect(topSearches[1].count).toBe(1);
  });

  it("should track recent searches", async () => {
    await liveAnalytics.logSearch("diabetes", 10);
    await liveAnalytics.logSearch("hypertension", 5);

    const snapshot = liveAnalytics.getSnapshot();
    const recentSearches = snapshot.recentSearches;

    expect(recentSearches.length).toBe(2);
    expect(recentSearches[0].query).toBe("hypertension");
    expect(recentSearches[1].query).toBe("diabetes");
  });

  it("should calculate hourly activity", async () => {
    await liveAnalytics.logSearch("diabetes", 10);
    await liveAnalytics.logSearch("panadol", 5);

    const snapshot = liveAnalytics.getSnapshot();
    const hourlyActivity = snapshot.hourlyActivity;

    expect(hourlyActivity.length).toBeGreaterThan(0);
    expect(hourlyActivity[0]).toHaveProperty("hour");
    expect(hourlyActivity[0]).toHaveProperty("count");
  });

  it("should reset analytics", async () => {
    await liveAnalytics.logSearch("diabetes", 10);
    let snapshot = liveAnalytics.getSnapshot();
    expect(snapshot.totalSearches).toBe(1);

    liveAnalytics.reset();
    snapshot = liveAnalytics.getSnapshot();

    expect(snapshot.totalSearches).toBe(0);
    expect(snapshot.uniqueSearchTerms).toBe(0);
  });

  it("should handle case-insensitive search terms", async () => {
    await liveAnalytics.logSearch("Diabetes", 10);
    await liveAnalytics.logSearch("DIABETES", 8);
    await liveAnalytics.logSearch("diabetes", 5);

    const snapshot = liveAnalytics.getSnapshot();

    expect(snapshot.uniqueSearchTerms).toBe(1);
    expect(snapshot.topSearches[0].count).toBe(3);
  });

  it("should limit recent searches to max size", async () => {
    // Log more than max recent searches
    for (let i = 0; i < 150; i++) {
      await liveAnalytics.logSearch(`search${i}`, i);
    }

    const snapshot = liveAnalytics.getSnapshot();
    expect(snapshot.recentSearches.length).toBeLessThanOrEqual(100);
  });

  it("should return empty analytics when no searches", () => {
    const snapshot = liveAnalytics.getSnapshot();

    expect(snapshot.totalSearches).toBe(0);
    expect(snapshot.uniqueSearchTerms).toBe(0);
    expect(snapshot.topSearches).toEqual([]);
  });
});
