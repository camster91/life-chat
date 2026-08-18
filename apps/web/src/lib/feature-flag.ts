import type { ActiveHouseholdContext } from "./identity-context";

export type FeatureFlagState = "disabled" | "beta" | "enabled" | "killed";

export type FeatureFlagDefinition = Readonly<{
  id: string;
  owner: string;
  risk: "low" | "medium" | "high";
  removalIssue: string;
}>;

export type HouseholdFeatureFlagConfiguration = Readonly<{
  householdId: string;
  state: FeatureFlagState;
  betaHouseholdIds: readonly string[];
}>;

export type FeatureFlagDecision =
  | { enabled: true; source: "beta" | "enabled" }
  | { enabled: false; reason: "household-mismatch" | "disabled" | "not-in-beta" | "killed" };

export function evaluateFeatureFlag(
  definition: FeatureFlagDefinition,
  configuration: HouseholdFeatureFlagConfiguration,
  context: ActiveHouseholdContext,
): FeatureFlagDecision {
  if (definition.id.trim().length === 0 || definition.owner.trim().length === 0 || definition.removalIssue.trim().length === 0) {
    throw new Error("Feature flags require an ID, owner, and removal issue");
  }
  if (configuration.householdId !== context.householdId) return { enabled: false, reason: "household-mismatch" };
  if (configuration.state === "killed") return { enabled: false, reason: "killed" };
  if (configuration.state === "disabled") return { enabled: false, reason: "disabled" };
  if (configuration.state === "beta") {
    return configuration.betaHouseholdIds.includes(context.householdId)
      ? { enabled: true, source: "beta" }
      : { enabled: false, reason: "not-in-beta" };
  }
  return { enabled: true, source: "enabled" };
}
