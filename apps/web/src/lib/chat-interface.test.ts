import { describe, expect, it } from "vitest";
import { createChatInterfaceState } from "./chat-interface";
import { createProposedAction } from "./ai-proposed-action";

const context = { authenticatedSubjectId: "subject_1", memberId: "member_1", householdId: "household_1" };
const action = createProposedAction({ id: "action_1", householdId: "household_1", actingMemberId: "member_1", operation: "task.complete", affectedRecords: [], fieldChangeSummary: [], reversible: true, validation: "valid", expiresAt: "2026-08-18T12:00:00Z", idempotencyKey: "action-key_1" }, "2026-08-18T11:00:00Z");
const message = { id: "message_1", householdId: "household_1", role: "assistant" as const, text: "I prepared a change for review.", citations: [{ label: "Open task", deepLink: "/chores/task_1" }], proposedActionId: "action_1" };

describe("Life Chat interface state", () => {
  it("keeps action references reviewable and offers retry only for a failed stream", () => {
    const state = createChatInterfaceState({ context, status: "failed", messages: [message], proposedActions: [action] });

    expect(state.canRetry).toBe(true);
    expect(state.messages[0]?.citations[0]?.deepLink).toBe("/chores/task_1");
    expect(state.proposedActions[0]?.state).toBe("proposed");
  });

  it("rejects cross-household messages, unsafe citations, and unprovided proposal references", () => {
    expect(() => createChatInterfaceState({ context, status: "idle", messages: [{ ...message, householdId: "household_2" }] })).toThrow("household");
    expect(() => createChatInterfaceState({ context, status: "idle", messages: [{ ...message, citations: [{ label: "Unsafe", deepLink: "https://outside.example" }] }] })).toThrow("application-relative");
    expect(() => createChatInterfaceState({ context, status: "idle", messages: [message] })).toThrow("supplied proposed action");
  });

  it("rejects a proposal from another active member", () => {
    expect(() => createChatInterfaceState({ context, status: "idle", messages: [], proposedActions: [{ ...action, actingMemberId: "member_2" }] })).toThrow("active member");
  });
});
