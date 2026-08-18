import { describe, expect, it } from "vitest";
import { acceptOutboxEvent, assertCanonicalReferenceVisible, assertServiceRequest } from "./shared-contract";

const context = { authenticatedSubjectId: "subject_1", memberId: "member_1", householdId: "household_1" };

describe("shared service and event contract", () => {
  it("requires idempotency for a writing service operation", () => {
    expect(() =>
      assertServiceRequest({
        context,
        operation: { appId: "chores", name: "chores.complete", version: 1, requiresIdempotency: true },
      }),
    ).toThrow("idempotency");
    expect(() =>
      assertServiceRequest({
        context,
        operation: { appId: "chores", name: "chores.complete", version: 1, requiresIdempotency: true },
        idempotencyKey: "complete:chore_1",
      }),
    ).not.toThrow();
  });

  it("fails closed on a cross-household canonical reference", () => {
    expect(() => assertCanonicalReferenceVisible(context, { type: "task", id: "task_1", householdId: "household_2" })).toThrow(
      "Cross-household",
    );
  });

  it("only accepts a valid event once and rejects mixed-household references", () => {
    const event = {
      eventId: "event_1",
      eventType: "chores.completed.v1",
      schemaVersion: 1 as const,
      householdId: "household_1",
      aggregate: { type: "chore", id: "chore_1", householdId: "household_1" },
      references: [{ type: "member", id: "member_1", householdId: "household_1" }],
    };
    expect(acceptOutboxEvent(event, new Set())).toEqual({ accepted: true });
    expect(acceptOutboxEvent(event, new Set(["event_1"]))).toEqual({ accepted: false, reason: "duplicate" });
    expect(() => acceptOutboxEvent({ ...event, references: [{ type: "member", id: "member_2", householdId: "household_2" }] }, new Set())).toThrow(
      "references must match",
    );
  });
});
