import { describe, expect, it } from "vitest";
import { planImportRollback, type ImportJournalEntry } from "./import-rollback";

const context = { authenticatedSubjectId: "subject_1", memberId: "member_1", householdId: "household_1" };
const entries: readonly ImportJournalEntry[] = [
  { importBatchId: "batch_1", targetHouseholdId: "household_1", targetType: "task", targetId: "task_1", mutation: "create", versionAfterImport: 2, preImportSnapshotRef: null },
  { importBatchId: "batch_1", targetHouseholdId: "household_1", targetType: "list", targetId: "list_1", mutation: "update", versionAfterImport: 4, preImportSnapshotRef: "snapshot_1" },
];

describe("import rollback planner", () => {
  it("produces version-guarded compensating instructions without target writes", () => {
    const plan = planImportRollback("batch_1", entries, context);

    expect(plan.writesTarget).toBe(false);
    expect(plan.eligibleForApprovedRollback).toBe(true);
    expect(plan.instructions).toEqual([
      { targetType: "task", targetId: "task_1", action: "retract-imported-record", preconditionVersion: 2, snapshotRef: null },
      { targetType: "list", targetId: "list_1", action: "restore-pre-import-snapshot", preconditionVersion: 4, snapshotRef: "snapshot_1" },
    ]);
  });

  it("blocks update rollback when its pre-import evidence is missing", () => {
    const plan = planImportRollback("batch_1", [{ ...entries[1]!, preImportSnapshotRef: null }], context);

    expect(plan.eligibleForApprovedRollback).toBe(false);
    expect(plan.instructions).toEqual([]);
    expect(plan.blockers).toEqual(["list:list_1:missing-pre-import-snapshot"]);
  });

  it("rejects cross-household or cross-batch journal evidence", () => {
    expect(() => planImportRollback("batch_1", [{ ...entries[0]!, targetHouseholdId: "household_2" }], context)).toThrow("target household");
    expect(() => planImportRollback("batch_1", [{ ...entries[0]!, importBatchId: "batch_2" }], context)).toThrow("batch mismatch");
  });
});
