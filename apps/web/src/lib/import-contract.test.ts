import { describe, expect, it } from "vitest";
import { validateImportDryRun, type ImportDryRunPlan } from "./import-contract";

const context = { authenticatedSubjectId: "subject_1", memberId: "member_1", householdId: "household_1" };
const plan: ImportDryRunPlan = {
  source: "meal-planner",
  sourceExportChecksum: "checksum_1",
  mappingVersion: 1,
  targetHouseholdId: "household_1",
  idempotencyKey: "meal-planner:checksum_1:household_1:v1",
  writesTarget: false,
  records: [{ sourceRecordId: "recipe_1", targetType: "recipe", targetHouseholdId: "household_1", outcome: "map", retentionClass: "private-content", consentVerified: true }],
};

describe("canonical import contract", () => {
  it("accepts a scoped no-write dry-run plan with required record governance", () => {
    expect(() => validateImportDryRun(plan, context)).not.toThrow();
  });

  it("rejects a cross-household import target", () => {
    expect(() => validateImportDryRun({ ...plan, targetHouseholdId: "household_2" }, context)).toThrow("target household");
  });

  it("rejects a mapped record without consent or retention evidence", () => {
    expect(() => validateImportDryRun({ ...plan, records: [{ ...plan.records[0]!, consentVerified: false }] }, context)).toThrow("consent");
    expect(() => validateImportDryRun({ ...plan, records: [{ ...plan.records[0]!, retentionClass: null }] }, context)).toThrow("retention");
  });
});
