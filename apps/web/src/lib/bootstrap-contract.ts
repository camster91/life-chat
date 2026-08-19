import { randomUUID } from "node:crypto";
import { createAuditEvent, newCorrelationId, type AuditEvent } from "./audit-event";

export type FirstOwnerBootstrapPlan = Readonly<{
  household: Readonly<{ householdId: string; name: string }>;
  owner: Readonly<{ memberId: string; subjectId: string; displayName: string; role: "adult"; lifecycle: "active" }>;
  auditEvent: AuditEvent;
}>;

export class BootstrapStateError extends Error {}

function assertBounded(value: string, name: string, maximum: number): string {
  const result = value.trim();
  if (result.length === 0 || result.length > maximum || /[\r\n\u0000]/.test(result)) {
    throw new BootstrapStateError(`${name} must be bounded and control-character free.`);
  }
  return result;
}

/**
 * Plans the one permitted setup-time mutation. A later repository must perform
 * the household-count check and all writes in one database transaction.
 */
export function planFirstOwnerBootstrap(input: {
  existingHouseholdCount: number;
  localOperatorConfirmed: boolean;
  subjectId: string;
  householdName: string;
  displayName: string;
  now: Date;
}): FirstOwnerBootstrapPlan {
  if (!Number.isSafeInteger(input.existingHouseholdCount) || input.existingHouseholdCount < 0) {
    throw new BootstrapStateError("Existing household count must be a non-negative integer.");
  }
  if (!input.localOperatorConfirmed) throw new BootstrapStateError("First-owner bootstrap requires explicit local operator confirmation.");
  if (input.existingHouseholdCount !== 0) throw new BootstrapStateError("First-owner bootstrap is unavailable after setup.");

  const subjectId = assertBounded(input.subjectId, "subjectId", 200);
  const householdName = assertBounded(input.householdName, "householdName", 120);
  const displayName = assertBounded(input.displayName, "displayName", 120);
  const householdId = randomUUID();
  const memberId = randomUUID();
  const correlationId = newCorrelationId();

  return Object.freeze({
    household: Object.freeze({ householdId, name: householdName }),
    owner: Object.freeze({ memberId, subjectId, displayName, role: "adult", lifecycle: "active" }),
    auditEvent: createAuditEvent({
      householdId,
      actor: { type: "system", id: "local-bootstrap" },
      action: "household.bootstrap-first-owner",
      target: { type: "member", id: memberId },
      outcome: "succeeded",
      correlationId,
      causationId: null,
      occurredAt: input.now.toISOString(),
      metadata: { setup: true },
    }),
  });
}
