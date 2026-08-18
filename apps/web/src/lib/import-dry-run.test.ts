import { describe, expect, it } from "vitest";
import { runImportDryRun } from "./import-dry-run";
import type { ImportDryRunPlan } from "./import-contract";

const context = { authenticatedSubjectId: "subject_1", memberId: "member_1", householdId: "household_1" };
const plan: ImportDryRunPlan = {
  source: "chore-champs",
  sourceExportChecksum: "checksum_1",
  mappingVersion: 1,
  targetHouseholdId: "household_1",
  idempotencyKey: "chore-champs:checksum_1:household_1:v1",
  writesTarget: false,
  records: [
    { sourceRecordId: "chore_1", targetType: "task", targetHouseholdId: "household_1", outcome: "map", retentionClass: "household", consentVerified: true },
    { sourceRecordId: "member_2", targetType: "member", targetHouseholdId: "household_1", outcome: "ambiguous", retentionClass: null, consentVerified: false },
    { sourceRecordId: "badge_3", targetType: "achievement", targetHouseholdId: "household_1", outcome: "skip", retentionClass: null, consentVerified: false },
  ],
};

describe("import dry-run reporter", () => {
  it("reports safe counts and blocking identity findings without a target write", () => {
    const report = runImportDryRun(plan, context);

    expect(report.writesTarget).toBe(false);
    expect(report.summary).toEqual({ total: 3, map: 1, skip: 1, ambiguous: 1, conflict: 0, invalid: 0 });
    expect(report.findings).toEqual([{ sourceRecordId: "member_2", targetType: "member", outcome: "ambiguous" }]);
    expect(report.eligibleForApprovedExecution).toBe(false);
  });

  it("is only eligible for a separate approval when every mapped record is clear", () => {
    const report = runImportDryRun({ ...plan, records: [plan.records[0]!] }, context);

    expect(report.eligibleForApprovedExecution).toBe(true);
    expect(report.findings).toEqual([]);
  });

  it("inherits the contract's server-derived household validation", () => {
    expect(() => runImportDryRun({ ...plan, targetHouseholdId: "household_2" }, context)).toThrow("target household");
  });
});
