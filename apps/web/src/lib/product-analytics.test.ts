import { describe, expect, it } from "vitest";
import { mayCollectProductAnalytics, validateProductAnalyticsEvent } from "./product-analytics";

describe("product analytics contract", () => {
  it("is default-off and adult-gated", () => {
    expect(mayCollectProductAnalytics("unconfigured", true)).toBe(false);
    expect(mayCollectProductAnalytics("granted", false)).toBe(false);
    expect(mayCollectProductAnalytics("granted", true)).toBe(true);
    expect(mayCollectProductAnalytics("withdrawn", true)).toBe(false);
  });

  it("accepts only bounded coarse measurement fields", () => {
    expect(validateProductAnalyticsEvent({
      name: "operation.outcome",
      occurredAt: "2026-08-18T12:00:00.000Z",
      properties: { surface: "today", outcome: "succeeded", durationBucket: "under-1s" },
    })).toMatchObject({ name: "operation.outcome" });
  });

  it("rejects household identifiers, content, and free-text-like values", () => {
    expect(() => validateProductAnalyticsEvent({ name: "feature.presented", occurredAt: "2026-08-18T12:00:00.000Z", properties: { householdId: "household_1" } })).toThrow("Unsafe analytics property");
    expect(() => validateProductAnalyticsEvent({ name: "feedback.opened", occurredAt: "2026-08-18T12:00:00.000Z", properties: { category: "line one\nline two" } })).toThrow("Unsafe analytics property value");
  });
});
