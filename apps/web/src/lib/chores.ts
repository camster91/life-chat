import { parseDateOnly, type DateOnly } from "./date-time";
import type { ActiveHouseholdContext } from "./identity-context";
import { activationEligibility, type HouseholdMiniAppConfiguration } from "./mini-app-registry";

export type ChoreAssignmentSummary = Readonly<{ id: string; householdId: string; assigneeMemberId: string; label: string; dueDate: DateOnly | null; state: "assigned" | "completed"; authorized: true }>;

/** Returns only the active member's already-authorized assignment summaries. */
export function createAssignedChores(input: { context: ActiveHouseholdContext; configuration: HouseholdMiniAppConfiguration; assignments: readonly ChoreAssignmentSummary[] }): readonly ChoreAssignmentSummary[] {
  if (!activationEligibility("chores", input.configuration).eligible) throw new Error("Chores mini-app must be enabled and eligible");
  return Object.freeze(input.assignments.map((assignment) => {
    if (assignment.householdId !== input.context.householdId || assignment.assigneeMemberId !== input.context.memberId) throw new Error("Chore assignment must match active member and household");
    if (!assignment.authorized || assignment.id.trim().length === 0 || assignment.label.trim().length === 0 || assignment.label.length > 200) throw new Error("Chore assignment must be authorized with bounded display data");
    if (assignment.dueDate !== null) parseDateOnly(assignment.dueDate);
    return Object.freeze({ ...assignment });
  }).sort((left, right) => (left.dueDate ?? "9999-12-31").localeCompare(right.dueDate ?? "9999-12-31") || left.label.localeCompare(right.label)));
}

/** This is a confirmation-required proposal, not a task mutation or reward event. */
export function proposeChoreCompletion(input: { context: ActiveHouseholdContext; configuration: HouseholdMiniAppConfiguration; assignment: ChoreAssignmentSummary }): Readonly<{ assignmentId: string; requiresConfirmation: true }> {
  createAssignedChores({ context: input.context, configuration: input.configuration, assignments: [input.assignment] });
  if (input.assignment.state !== "assigned") throw new Error("Only an assigned chore may be proposed for completion");
  return Object.freeze({ assignmentId: input.assignment.id, requiresConfirmation: true });
}
