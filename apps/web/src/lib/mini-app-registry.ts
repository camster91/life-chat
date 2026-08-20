export type MiniAppId =
  | "habits"
  | "chores"
  | "rewards"
  | "meals"
  | "groceries"
  | "shared-lists"
  | "projects"
  | "messages"
  | "budget";

export type MiniAppDefinition = {
  id: MiniAppId;
  version: 1;
  label: string;
  dependsOn: readonly MiniAppId[];
  declaredCapabilities: readonly string[];
  settingsSchemaVersion: 1;
};

export type HouseholdMiniAppConfiguration = Record<MiniAppId, { enabled: boolean; settingsSchemaVersion: 1 }>;

export const miniAppRegistry: readonly MiniAppDefinition[] = [
  { id: "habits", version: 1, label: "Habits", dependsOn: [], declaredCapabilities: ["habits.read", "habits.record", "habits.manage"], settingsSchemaVersion: 1 },
  { id: "chores", version: 1, label: "Chores", dependsOn: [], declaredCapabilities: ["chores.complete-assigned", "chores.manage"], settingsSchemaVersion: 1 },
  { id: "rewards", version: 1, label: "Rewards and allowance", dependsOn: ["chores"], declaredCapabilities: ["rewards.read", "rewards.request", "rewards.manage", "rewards.approve"], settingsSchemaVersion: 1 },
  { id: "meals", version: 1, label: "Meals", dependsOn: [], declaredCapabilities: ["meals.read", "meals.manage"], settingsSchemaVersion: 1 },
  { id: "groceries", version: 1, label: "Groceries", dependsOn: ["shared-lists"], declaredCapabilities: ["groceries.read", "groceries.manage"], settingsSchemaVersion: 1 },
  { id: "shared-lists", version: 1, label: "Shared lists", dependsOn: [], declaredCapabilities: ["lists.read", "lists.complete", "lists.manage"], settingsSchemaVersion: 1 },
  { id: "projects", version: 1, label: "Projects", dependsOn: ["shared-lists"], declaredCapabilities: ["projects.manage"], settingsSchemaVersion: 1 },
  { id: "messages", version: 1, label: "Messages", dependsOn: [], declaredCapabilities: ["messages.participate"], settingsSchemaVersion: 1 },
  { id: "budget", version: 1, label: "Budget", dependsOn: [], declaredCapabilities: ["budget.view"], settingsSchemaVersion: 1 },
];

export function defaultMiniAppConfiguration(): HouseholdMiniAppConfiguration {
  return Object.fromEntries(miniAppRegistry.map((app) => [app.id, { enabled: false, settingsSchemaVersion: 1 }])) as HouseholdMiniAppConfiguration;
}

export function activationEligibility(appId: string, configuration: HouseholdMiniAppConfiguration): { eligible: true } | { eligible: false; reason: "unknown-app" | "disabled" | "missing-dependency" } {
  const app = miniAppRegistry.find((candidate) => candidate.id === appId);
  if (app === undefined) return { eligible: false, reason: "unknown-app" };
  if (!configuration[app.id].enabled) return { eligible: false, reason: "disabled" };
  if (app.dependsOn.some((dependency) => !configuration[dependency].enabled)) return { eligible: false, reason: "missing-dependency" };
  return { eligible: true };
}
