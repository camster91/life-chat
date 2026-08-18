import { activationEligibility, type HouseholdMiniAppConfiguration, miniAppRegistry } from "./mini-app-registry";

export type ShellRoute = "today" | "chat" | "apps" | "calendar" | "family" | "search" | "notifications" | "settings";
export type ShellNavigationItem = Readonly<{ route: ShellRoute; label: string; available: boolean }>;

const coreNavigation: readonly Omit<ShellNavigationItem, "available">[] = [
  { route: "today", label: "Today" },
  { route: "chat", label: "Chat" },
  { route: "apps", label: "Apps" },
  { route: "calendar", label: "Calendar" },
  { route: "family", label: "Family" },
  { route: "search", label: "Search" },
  { route: "notifications", label: "Notifications" },
  { route: "settings", label: "Settings" },
];

/** Maps an already-authorized household configuration to display navigation. */
export function createShellNavigation(configuration: HouseholdMiniAppConfiguration): readonly ShellNavigationItem[] {
  const enabledApps = miniAppRegistry.some((app) => activationEligibility(app.id, configuration).eligible);
  return coreNavigation.map((item) => ({ ...item, available: item.route !== "apps" || enabledApps }));
}
