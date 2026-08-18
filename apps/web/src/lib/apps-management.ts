import type { ActiveHouseholdContext } from "./identity-context";
import { activationEligibility, miniAppRegistry, type HouseholdMiniAppConfiguration, type MiniAppId } from "./mini-app-registry";
import { authorize, type BaselineRole, type CapabilityGrant } from "./permission-engine";

export type AppManagementItem = Readonly<{
  id: MiniAppId;
  label: string;
  enabled: boolean;
  eligibility: "eligible" | "disabled" | "missing-dependency";
  missingDependencies: readonly MiniAppId[];
  enabledDependents: readonly MiniAppId[];
}>;

export type AppConfigurationProposal = Readonly<{
  appId: MiniAppId;
  desiredEnabled: boolean;
  requiresConfirmation: true;
}>;

export function createAppsManagementState(input: {
  context: ActiveHouseholdContext;
  role: BaselineRole;
  grants: readonly CapabilityGrant[];
  now: Date;
  configuration: HouseholdMiniAppConfiguration;
}): Readonly<{ canConfigure: boolean; items: readonly AppManagementItem[] }> {
  const decision = authorize({ context: input.context, role: input.role, grants: input.grants, now: input.now, request: { householdId: input.context.householdId, permission: "mini-app.configure" } });
  return {
    canConfigure: decision.allowed,
    items: miniAppRegistry.map((app) => {
      const eligibility = activationEligibility(app.id, input.configuration);
      return {
        id: app.id,
        label: app.label,
        enabled: input.configuration[app.id].enabled,
        eligibility: eligibility.eligible ? "eligible" : eligibility.reason === "missing-dependency" ? "missing-dependency" : "disabled",
        missingDependencies: app.dependsOn.filter((dependency) => !input.configuration[dependency].enabled),
        enabledDependents: miniAppRegistry.filter((candidate) => candidate.dependsOn.includes(app.id) && input.configuration[candidate.id].enabled).map((candidate) => candidate.id),
      };
    }),
  };
}

/** Creates a review-only request; a separate server command must reauthorize, confirm, audit, and persist it. */
export function proposeAppConfigurationChange(input: {
  state: ReturnType<typeof createAppsManagementState>;
  appId: MiniAppId;
  desiredEnabled: boolean;
}): AppConfigurationProposal {
  if (!input.state.canConfigure) throw new Error("Only an authorized member may propose app configuration");
  const item = input.state.items.find((candidate) => candidate.id === input.appId);
  if (item === undefined) throw new Error("Unknown app");
  if (item.enabled === input.desiredEnabled) throw new Error("App already has the requested configuration");
  if (input.desiredEnabled && item.missingDependencies.length > 0) throw new Error("App dependencies must be enabled before proposing activation");
  if (!input.desiredEnabled && item.enabledDependents.length > 0) throw new Error("Enabled dependent apps must be resolved before disabling this app");
  return { appId: input.appId, desiredEnabled: input.desiredEnabled, requiresConfirmation: true };
}
