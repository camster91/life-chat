export type ReleaseEnvironment = "local" | "ci" | "staging" | "production";

export type ReleasePlan = Readonly<{
  environment: ReleaseEnvironment;
  revision: string;
  localChecksPassed: boolean;
  ciChecksPassed: boolean;
  verificationOwner: string;
  rollbackRevision: string;
  approvalReference: string | null;
  migration: Readonly<{
    required: boolean;
    backupRestoreVerified: boolean;
    rehearsalPassed: boolean;
  }>;
}>;

export type ReleasePlanDecision = { ready: true } | { ready: false; missing: string[] };

export function evaluateReleasePlan(plan: ReleasePlan): ReleasePlanDecision {
  const missing: string[] = [];
  if (plan.revision.trim().length === 0) missing.push("revision");
  if (!plan.localChecksPassed) missing.push("local checks");
  if (!plan.ciChecksPassed) missing.push("CI checks");
  if (plan.verificationOwner.trim().length === 0) missing.push("verification owner");
  if (plan.rollbackRevision.trim().length === 0) missing.push("rollback revision");
  if (plan.environment === "production" && (plan.approvalReference === null || plan.approvalReference.trim().length === 0)) {
    missing.push("production approval");
  }
  if (plan.migration.required && !plan.migration.backupRestoreVerified) missing.push("backup/restore verification");
  if (plan.migration.required && !plan.migration.rehearsalPassed) missing.push("migration rehearsal");
  return missing.length === 0 ? { ready: true } : { ready: false, missing };
}
