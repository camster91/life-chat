import type { ActiveHouseholdContext } from "./identity-context";
import { activationEligibility, type HouseholdMiniAppConfiguration } from "./mini-app-registry";
export type ProjectSummary = Readonly<{ id: string; householdId: string; label: string; scope: "personal" | "household"; status: "active" | "paused" | "complete"; calendarDeepLink: string | null; authorized: true }>;
export function createProjectView(input: { context: ActiveHouseholdContext; configuration: HouseholdMiniAppConfiguration; projects: readonly ProjectSummary[] }): readonly ProjectSummary[] {
  if (!activationEligibility("projects", input.configuration).eligible) throw new Error("Projects mini-app and Shared lists dependency must be enabled and eligible");
  return Object.freeze(input.projects.map((project) => {
    if (project.householdId !== input.context.householdId || !project.authorized) throw new Error("Project must match active household and be authorized");
    if (project.id.trim().length === 0 || project.label.trim().length === 0 || project.label.length > 200) throw new Error("Project display data must be bounded");
    if (project.calendarDeepLink !== null && !project.calendarDeepLink.startsWith("/")) throw new Error("Project calendar links must be application-relative");
    return Object.freeze({ ...project });
  }).sort((left, right) => (left.status === right.status ? left.label.localeCompare(right.label) : left.status === "active" ? -1 : 1)));
}
export function proposeProjectStatusChange(input: { context: ActiveHouseholdContext; configuration: HouseholdMiniAppConfiguration; project: ProjectSummary; desiredStatus: ProjectSummary["status"] }): Readonly<{ projectId: string; desiredStatus: ProjectSummary["status"]; requiresConfirmation: true }> {
  createProjectView({ context: input.context, configuration: input.configuration, projects: [input.project] });
  if (input.project.status === input.desiredStatus) throw new Error("Project already has the requested status");
  return Object.freeze({ projectId: input.project.id, desiredStatus: input.desiredStatus, requiresConfirmation: true });
}
