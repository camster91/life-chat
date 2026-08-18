import { describe, expect, it } from "vitest";
import { reconcileMigrationParity } from "./migration-parity";

const context = { authenticatedSubjectId: "subject_1", memberId: "member_1", householdId: "household_1" };
const input = {
  migrationId: "meal-import_1",
  targetHouseholdId: "household_1",
  expected: [{ targetType: "recipe", recordCount: 3, opaqueChecksum: "expected_recipe_checksum" }],
  observed: [{ targetType: "recipe", recordCount: 3, opaqueChecksum: "expected_recipe_checksum" }],
};

describe("migration parity reconciliation", () => {
  it("certifies matching aggregate evidence but never authorizes retirement", () => {
    expect(reconcileMigrationParity(input, context)).toEqual({
      migrationId: "meal-import_1", targetHouseholdId: "household_1", verified: true, differences: [], retirementAuthorized: false,
    });
  });

  it("reports count/checksum divergence without exposing source content", () => {
    const report = reconcileMigrationParity({ ...input, observed: [{ targetType: "recipe", recordCount: 2, opaqueChecksum: "other_checksum" }] }, context);

    expect(report.verified).toBe(false);
    expect(report.differences).toEqual([{ targetType: "recipe", expectedCount: 3, observedCount: 2, checksumMatches: false }]);
  });

  it("fails closed for a missing target type, duplicate controls, or a cross-household report", () => {
    expect(reconcileMigrationParity({ ...input, observed: [] }, context).differences).toEqual([{ targetType: "recipe", expectedCount: 3, observedCount: null, checksumMatches: null }]);
    expect(() => reconcileMigrationParity({ ...input, expected: [...input.expected, input.expected[0]!] }, context)).toThrow("once");
    expect(() => reconcileMigrationParity({ ...input, targetHouseholdId: "household_2" }, context)).toThrow("target household");
  });
});
