import type { ActiveHouseholdContext } from "./identity-context";

export type ImportMutationKind = "create" | "update";
export type ImportJournalEntry = Readonly<{
  importBatchId: string;
  targetHouseholdId: string;
  targetType: string;
  targetId: string;
  mutation: ImportMutationKind;
  versionAfterImport: number;
  preImportSnapshotRef: string | null;
}>;

export type RollbackInstruction = Readonly<{
  targetType: string;
  targetId: string;
  action: "retract-imported-record" | "restore-pre-import-snapshot";
  preconditionVersion: number;
  snapshotRef: string | null;
}>;

export type ImportRollbackPlan = Readonly<{
  importBatchId: string;
  targetHouseholdId: string;
  writesTarget: false;
  instructions: readonly RollbackInstruction[];
  blockers: readonly string[];
  eligibleForApprovedRollback: boolean;
}>;

function assertOpaque(value: string, name: string): void {
  if (value.trim().length === 0 || value.length > 200) throw new Error(`${name} must be a bounded identifier`);
}

/**
 * Builds compensating instructions only. Applying any instruction is a future
 * privileged transaction, after fresh approval and version reauthorization.
 */
export function planImportRollback(
  importBatchId: string,
  entries: readonly ImportJournalEntry[],
  context: ActiveHouseholdContext,
): ImportRollbackPlan {
  assertOpaque(importBatchId, "import batch ID");
  const instructions: RollbackInstruction[] = [];
  const blockers: string[] = [];

  for (const entry of entries) {
    assertOpaque(entry.targetType, "target type");
    assertOpaque(entry.targetId, "target ID");
    if (entry.importBatchId !== importBatchId) throw new Error("Rollback journal batch mismatch");
    if (entry.targetHouseholdId !== context.householdId) throw new Error("Rollback target household must match active context");
    if (!Number.isSafeInteger(entry.versionAfterImport) || entry.versionAfterImport < 1) {
      throw new Error("Rollback journal requires a positive target version");
    }
    if (entry.mutation === "create") {
      instructions.push({ targetType: entry.targetType, targetId: entry.targetId, action: "retract-imported-record", preconditionVersion: entry.versionAfterImport, snapshotRef: null });
    } else if (entry.preImportSnapshotRef === null) {
      blockers.push(`${entry.targetType}:${entry.targetId}:missing-pre-import-snapshot`);
    } else {
      instructions.push({ targetType: entry.targetType, targetId: entry.targetId, action: "restore-pre-import-snapshot", preconditionVersion: entry.versionAfterImport, snapshotRef: entry.preImportSnapshotRef });
    }
  }

  return {
    importBatchId,
    targetHouseholdId: context.householdId,
    writesTarget: false,
    instructions,
    blockers,
    eligibleForApprovedRollback: entries.length > 0 && blockers.length === 0,
  };
}
