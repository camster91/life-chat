import { describe, expect, it } from "vitest";
import { createAuditEvent, createDomainEvent, newCorrelationId } from "./audit-event";

const correlationId = "c1f7ca6d-f436-4f87-b875-d38cf1d5f8bc";

describe("audit and domain event envelopes", () => {
  it("creates append-only audit evidence with explicit outcome and safe metadata", () => {
    const event = createAuditEvent({
      householdId: "household-a", actor: { type: "member", id: "member-a" }, action: "member.invited",
      target: { type: "invitation", id: "invite-a" }, outcome: "succeeded", correlationId, causationId: null,
      occurredAt: "2026-08-18T12:00:00.000Z", metadata: { channel: "household-settings", retryCount: 0 },
    });
    expect(event).toMatchObject({ outcome: "succeeded", correlationId, metadata: { channel: "household-settings", retryCount: 0 } });
    expect(event.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(Object.isFrozen(event.metadata)).toBe(true);
    expect(Object.isFrozen(event)).toBe(true);
  });

  it("fails closed when metadata resembles a secret or private content", () => {
    expect(() => createAuditEvent({
      householdId: "household-a", actor: { type: "system", id: "worker" }, action: "export.started", target: { type: "export", id: "export-a" },
      outcome: "succeeded", correlationId, causationId: null, metadata: { sessionToken: "do-not-log" },
    })).toThrow(RangeError);
    expect(() => createAuditEvent({
      householdId: "household-a", actor: { type: "system", id: "worker" }, action: "export.started", target: { type: "export", id: "export-a" },
      outcome: "succeeded", correlationId, causationId: null, metadata: { note: "line one\nline two" },
    })).toThrow(RangeError);
  });

  it("emits domain references rather than private aggregate content", () => {
    const event = createDomainEvent({
      householdId: "household-a", aggregate: { type: "list", id: "list-a" }, type: "list.item-completed", correlationId,
      causationId: "audit-a", occurredAt: "2026-08-18T12:00:00.000Z", references: { itemId: "item-a" },
    });
    expect(event).toMatchObject({ schemaVersion: 1, references: { itemId: "item-a" } });
    expect(Object.isFrozen(event.references)).toBe(true);
    expect(() => createDomainEvent({
      householdId: "household-a", aggregate: { type: "list", id: "list-a" }, type: "list.item-completed", correlationId,
      causationId: null, references: { messageBody: "private-content" },
    })).toThrow(RangeError);
  });

  it("generates opaque correlation identifiers", () => {
    expect(newCorrelationId()).toMatch(/^[0-9a-f-]{36}$/);
  });
});
