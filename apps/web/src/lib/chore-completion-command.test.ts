import { describe, expect, it } from "vitest";
import { completeAssignedChore } from "./chore-completion-command";
import { defaultMiniAppConfiguration } from "./mini-app-registry";

const context = { authenticatedSubjectId: "subject-a", memberId: "member-a", householdId: "household-a" };
const config = defaultMiniAppConfiguration(); config.chores.enabled = true;
const assignment = { id: "chore-a", householdId: "household-a", assigneeMemberId: "member-a", label: "Tidy", dueDate: null, state: "assigned" as const, authorized: true as const };
describe("complete assigned chore command", () => {
  it("authorizes the assigned child and returns audit/outbox evidence", () => {
    const result = completeAssignedChore({ context, role: "child", grants: [], configuration: config, assignment, idempotencyKey: "complete-a", now: new Date("2026-08-18T12:00:00Z"), completed: new Map() });
    expect(result).toMatchObject({ assignmentId: "chore-a", auditEvent: { action: "chores.complete" }, domainEvent: { type: "chores.completed.v1" } });
  });
  it("denies another member and returns the original safe result for a retry", () => {
    expect(() => completeAssignedChore({ context: { ...context, memberId: "member-b" }, role: "child", grants: [], configuration: config, assignment, idempotencyKey: "x", now: new Date(), completed: new Map() })).toThrow();
    const first = completeAssignedChore({ context, role: "child", grants: [], configuration: config, assignment, idempotencyKey: "same", now: new Date(), completed: new Map() });
    expect(completeAssignedChore({ context, role: "child", grants: [], configuration: config, assignment, idempotencyKey: "same", now: new Date(), completed: new Map([["same", first]]) })).toBe(first);
  });
});
