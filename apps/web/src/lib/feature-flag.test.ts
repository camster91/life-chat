import { describe, expect, it } from "vitest";
import { evaluateFeatureFlag } from "./feature-flag";

const definition = { id: "today.summary.v1", owner: "today", risk: "low" as const, removalIssue: "#16" };
const context = { authenticatedSubjectId: "subject_1", memberId: "member_1", householdId: "household_1" };

describe("feature flag evaluation", () => {
  it("is disabled by default and remains household-scoped", () => {
    expect(evaluateFeatureFlag(definition, { householdId: "household_1", state: "disabled", betaHouseholdIds: [] }, context)).toEqual({ enabled: false, reason: "disabled" });
    expect(evaluateFeatureFlag(definition, { householdId: "household_2", state: "enabled", betaHouseholdIds: [] }, context)).toEqual({ enabled: false, reason: "household-mismatch" });
  });

  it("requires explicit beta enrollment", () => {
    expect(evaluateFeatureFlag(definition, { householdId: "household_1", state: "beta", betaHouseholdIds: [] }, context)).toEqual({ enabled: false, reason: "not-in-beta" });
    expect(evaluateFeatureFlag(definition, { householdId: "household_1", state: "beta", betaHouseholdIds: ["household_1"] }, context)).toEqual({ enabled: true, source: "beta" });
  });

  it("makes a kill switch take precedence over all enablement", () => {
    expect(evaluateFeatureFlag(definition, { householdId: "household_1", state: "killed", betaHouseholdIds: ["household_1"] }, context)).toEqual({ enabled: false, reason: "killed" });
  });
});
