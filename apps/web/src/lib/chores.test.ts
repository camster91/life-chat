import { describe, expect, it } from "vitest";
import { createAssignedChores, proposeChoreCompletion, type ChoreAssignmentSummary } from "./chores";
import { defaultMiniAppConfiguration } from "./mini-app-registry";

const context = { authenticatedSubjectId: "subject_1", memberId: "member_1", householdId: "household_1" };
const configuration = defaultMiniAppConfiguration(); configuration.chores.enabled = true;
const assignment: ChoreAssignmentSummary = { id: "chore_1", householdId: "household_1", assigneeMemberId: "member_1", label: "Unload dishwasher", dueDate: "2026-08-18", state: "assigned", authorized: true };

describe("Chores", () => {
  it("returns ordered active-member assignments and creates a confirmation proposal", () => {
    expect(createAssignedChores({ context, configuration, assignments: [assignment] })).toEqual([assignment]);
    expect(proposeChoreCompletion({ context, configuration, assignment })).toEqual({ assignmentId: "chore_1", requiresConfirmation: true });
  });
  it("requires the app and rejects cross-member/household assignments", () => {
    expect(() => createAssignedChores({ context, configuration: defaultMiniAppConfiguration(), assignments: [assignment] })).toThrow("enabled and eligible");
    expect(() => createAssignedChores({ context, configuration, assignments: [{ ...assignment, assigneeMemberId: "member_2" }] })).toThrow("active member");
    expect(() => createAssignedChores({ context, configuration, assignments: [{ ...assignment, householdId: "household_2" }] })).toThrow("active member and household");
  });
  it("does not re-propose a completed assignment", () => {
    expect(() => proposeChoreCompletion({ context, configuration, assignment: { ...assignment, state: "completed" } })).toThrow("Only an assigned");
  });
});
