import { describe, expect, it } from "vitest";
import { createOperationalEvent } from "./operational-event";

describe("operational event contract", () => {
  const event = {
    occurredAt: "2026-08-18T12:00:00.000Z",
    severity: "error" as const,
    code: "dependency.unavailable",
    component: "notification-worker",
    outcome: "degraded" as const,
    correlationId: "correlation_1",
    metadata: { dependency: "mail-adapter", retryable: true },
  };

  it("allows structured safe operational fields", () => {
    expect(createOperationalEvent(event)).toMatchObject({ code: "dependency.unavailable" });
  });

  it("rejects private content and log injection-shaped metadata", () => {
    expect(() => createOperationalEvent({ ...event, metadata: { messageBody: "private" } })).toThrow("Unsafe operational metadata key");
    expect(() => createOperationalEvent({ ...event, metadata: { diagnostic: "line one\nline two" } })).toThrow("Unsafe operational metadata value");
  });
});
