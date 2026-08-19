import { createAuditEvent, createDomainEvent, newCorrelationId, type AuditEvent, type DomainEvent } from "./audit-event";
import { createAssignedChores, type ChoreAssignmentSummary } from "./chores";
import type { ActiveHouseholdContext } from "./identity-context";
import type { HouseholdMiniAppConfiguration } from "./mini-app-registry";
import { authorize, type BaselineRole, type CapabilityGrant } from "./permission-engine";

export type ChoreCompletionResult = Readonly<{ assignmentId: string; state: "completed"; auditEvent: AuditEvent; domainEvent: DomainEvent }>;

export function completeAssignedChore(input: {
  context: ActiveHouseholdContext; role: BaselineRole; grants: readonly CapabilityGrant[]; configuration: HouseholdMiniAppConfiguration;
  assignment: ChoreAssignmentSummary; idempotencyKey: string; now: Date; completed: ReadonlyMap<string, ChoreCompletionResult>;
}): ChoreCompletionResult {
  if (input.idempotencyKey.trim().length === 0 || input.idempotencyKey.length > 200) throw new Error("A bounded idempotency key is required.");
  const existing = input.completed.get(input.idempotencyKey);
  if (existing !== undefined) return existing;
  const decision = authorize({ context: input.context, role: input.role, grants: input.grants, now: input.now, request: { householdId: input.context.householdId, permission: "chores.complete-assigned" } });
  if (!decision.allowed) throw new Error("Chore completion is not authorized.");
  createAssignedChores({ context: input.context, configuration: input.configuration, assignments: [input.assignment] });
  if (input.assignment.state !== "assigned") throw new Error("Only assigned chores may be completed.");
  const correlationId = newCorrelationId();
  const auditEvent = createAuditEvent({ householdId: input.context.householdId, actor: { type: "member", id: input.context.memberId }, action: "chores.complete", target: { type: "chore", id: input.assignment.id }, outcome: "succeeded", correlationId, causationId: null, occurredAt: input.now.toISOString(), metadata: { source: "normal-ui" } });
  const domainEvent = createDomainEvent({ householdId: input.context.householdId, aggregate: { type: "chore", id: input.assignment.id }, type: "chores.completed.v1", correlationId, causationId: auditEvent.id, occurredAt: input.now.toISOString(), references: { assigneeMemberId: input.context.memberId } });
  return Object.freeze({ assignmentId: input.assignment.id, state: "completed", auditEvent, domainEvent });
}
