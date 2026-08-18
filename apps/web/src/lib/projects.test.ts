import { describe, expect, it } from "vitest";
import { createProjectView, proposeProjectStatusChange, type ProjectSummary } from "./projects";
import { defaultMiniAppConfiguration } from "./mini-app-registry";
const context = { authenticatedSubjectId: "subject_1", memberId: "member_1", householdId: "household_1" };
const configuration = defaultMiniAppConfiguration(); configuration["shared-lists"].enabled = true; configuration.projects.enabled = true;
const project: ProjectSummary = { id: "project_1", householdId: "household_1", label: "Plan vacation", scope: "household", status: "active", calendarDeepLink: "/calendar/item_1", authorized: true };
describe("Projects", () => {
  it("returns authorized projects and a confirmation-only status proposal", () => { expect(createProjectView({ context, configuration, projects: [project] })).toEqual([project]); expect(proposeProjectStatusChange({ context, configuration, project, desiredStatus: "paused" })).toEqual({ projectId: "project_1", desiredStatus: "paused", requiresConfirmation: true }); });
  it("requires the Shared lists dependency and rejects duplicate status", () => { expect(() => createProjectView({ context, configuration: defaultMiniAppConfiguration(), projects: [project] })).toThrow("enabled and eligible"); expect(() => proposeProjectStatusChange({ context, configuration, project, desiredStatus: "active" })).toThrow("already has"); });
  it("rejects cross-household and unsafe calendar links", () => { expect(() => createProjectView({ context, configuration, projects: [{ ...project, householdId: "household_2" }] })).toThrow("active household"); expect(() => createProjectView({ context, configuration, projects: [{ ...project, calendarDeepLink: "https://outside.example" }] })).toThrow("application-relative"); });
});
