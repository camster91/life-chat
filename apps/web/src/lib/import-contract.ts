import type { ActiveHouseholdContext } from "./identity-context";

export const importSources = ["family-planner", "lifestreak", "chore-champs", "meal-planner", "budget-app"] as const;
export type ImportSource = (typeof importSources)[number];
export type ImportOutcome = "map" | "skip" | "ambiguous" | "conflict" | "invalid";

export type ImportRecordPlan = Readonly<{
  sourceRecordId: string;
  targetType: string;
  targetHouseholdId: string;
  outcome: ImportOutcome;
  retentionClass: string | null;
  consentVerified: boolean;
}>;

export type ImportDryRunPlan = Readonly<{
  source: ImportSource;
  sourceExportChecksum: string;
  mappingVersion: 1;
  targetHouseholdId: string;
  idempotencyKey: string;
  records: readonly ImportRecordPlan[];
  writesTarget: false;
}>;

function assertBounded(value: string, name: string): void {
  if (value.trim().length === 0 || value.length > 200) throw new Error(`${name} must be a bounded identifier`);
}

export function validateImportDryRun(plan: ImportDryRunPlan, context: ActiveHouseholdContext): void {
  assertBounded(plan.sourceExportChecksum, "source export checksum");
  assertBounded(plan.idempotencyKey, "import idempotency key");
  if (plan.targetHouseholdId !== context.householdId) throw new Error("Import target household must match active context");
  if (plan.writesTarget !== false) throw new Error("Dry runs must never write target records");
  for (const record of plan.records) {
    assertBounded(record.sourceRecordId, "source record ID");
    assertBounded(record.targetType, "target type");
    if (record.targetHouseholdId !== context.householdId) throw new Error("Import record household mismatch");
    if (record.outcome === "map" && (!record.consentVerified || record.retentionClass === null)) {
      throw new Error("Mapped records require verified consent and retention class");
    }
  }
}
