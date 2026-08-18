import { describe, expect, it } from "vitest";
import {
  confirmProposedAction,
  createProposedAction,
  rejectOrSupersedeProposedAction,
  settleProposedAction,
} from "./ai-proposed-action";

const now = "2026-08-18T14:00:00.000Z";
const input = {
  id: "proposal_1",
  householdId: "household_1",
  actingMemberId: "member_1",
  operation: "task.complete",
  affectedRecords: [{ type: "task", id: "task_1" }],
  fieldChangeSummary: [{ field: "status", before: "open", after: "completed" }],
  reversible: true,
  validation: "valid" as const,
  expiresAt: "2026-08-18T14:05:00.000Z",
  idempotencyKey: "proposal_1:task.complete",
};

describe("AI proposed-action contract", () => {
  it("requires explicit confirmation by the proposing member", () => {
    const proposal = createProposedAction(input, now);
    expect(() => confirmProposedAction(proposal, "member_2", now)).toThrow("proposing member");
    expect(confirmProposedAction(proposal, "member_1", now).state).toBe("confirmed");
  });

  it("expires stale proposals instead of executing them", () => {
    const proposal = createProposedAction(input, now);
    expect(confirmProposedAction(proposal, "member_1", "2026-08-18T14:05:00.000Z").state).toBe("expired");
  });

  it("requires a fresh authorization result before execution", () => {
    const confirmed = confirmProposedAction(createProposedAction(input, now), "member_1", now);
    expect(() => settleProposedAction(confirmed, "executed", false)).toThrow("confirmation-time authorization");
    expect(settleProposedAction(confirmed, "executed", true).state).toBe("executed");
  });

  it("requires a new proposal when an action is changed", () => {
    const proposal = createProposedAction(input, now);
    expect(rejectOrSupersedeProposedAction(proposal, "member_1", "superseded").state).toBe("superseded");
    expect(() => createProposedAction({ ...input, validation: "invalid" }, now)).toThrow("Invalid proposals");
  });
});
