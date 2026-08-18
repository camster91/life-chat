import type { ActiveHouseholdContext } from "./identity-context";
import {
  type ImportDryRunPlan,
  type ImportOutcome,
  type ImportSource,
  validateImportDryRun,
} from "./import-contract";

export type ImportDryRunSummary = Readonly<Record<ImportOutcome, number> & {
  total: number;
}>;

type MutableImportDryRunSummary = Record<ImportOutcome, number> & { total: number };

export type ImportDryRunFinding = Readonly<{
  sourceRecordId: string;
  targetType: string;
  outcome: Exclude<ImportOutcome, "map" | "skip">;
}>;

export type ImportDryRunReport = Readonly<{
  source: ImportSource;
  sourceExportChecksum: string;
  mappingVersion: number;
  targetHouseholdId: string;
  idempotencyKey: string;
  writesTarget: false;
  summary: ImportDryRunSummary;
  findings: readonly ImportDryRunFinding[];
  eligibleForApprovedExecution: boolean;
}>;

const outcomes: readonly ImportOutcome[] = ["map", "skip", "ambiguous", "conflict", "invalid"];

function emptySummary(): MutableImportDryRunSummary {
  return { total: 0, map: 0, skip: 0, ambiguous: 0, conflict: 0, invalid: 0 };
}

/**
 * Produces a review-only report for a previously constructed import plan.
 * It deliberately has no adapter, persistence, network, or mutation dependency.
 */
export function runImportDryRun(plan: ImportDryRunPlan, context: ActiveHouseholdContext): ImportDryRunReport {
  validateImportDryRun(plan, context);
  const summary = emptySummary();
  const findings: ImportDryRunFinding[] = [];

  for (const record of plan.records) {
    summary.total += 1;
    summary[record.outcome] += 1;
    if (record.outcome === "ambiguous" || record.outcome === "conflict" || record.outcome === "invalid") {
      findings.push({ sourceRecordId: record.sourceRecordId, targetType: record.targetType, outcome: record.outcome });
    }
  }

  for (const outcome of outcomes) {
    if (summary[outcome] < 0) throw new Error("Dry-run outcome count cannot be negative");
  }

  return {
    source: plan.source,
    sourceExportChecksum: plan.sourceExportChecksum,
    mappingVersion: plan.mappingVersion,
    targetHouseholdId: plan.targetHouseholdId,
    idempotencyKey: plan.idempotencyKey,
    writesTarget: false,
    summary,
    findings,
    eligibleForApprovedExecution: summary.map > 0 && findings.length === 0,
  };
}
