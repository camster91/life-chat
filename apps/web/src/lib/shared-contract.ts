import type { ActiveHouseholdContext } from "./identity-context";
import type { MiniAppId } from "./mini-app-registry";

export type CanonicalReference = Readonly<{ type: string; id: string; householdId: string }>;

export type ServiceOperation = Readonly<{
  appId: MiniAppId | "shared";
  name: string;
  version: 1;
  requiresIdempotency: boolean;
}>;

export type ServiceRequest = Readonly<{
  context: ActiveHouseholdContext;
  operation: ServiceOperation;
  idempotencyKey?: string;
}>;

export type OutboxEvent = Readonly<{
  eventId: string;
  eventType: string;
  schemaVersion: 1;
  householdId: string;
  aggregate: CanonicalReference;
  references: readonly CanonicalReference[];
}>;

export type MiniAppContract = Readonly<{
  appId: MiniAppId;
  schemaVersion: 1;
  serviceOperations: readonly ServiceOperation[];
  eventTypes: readonly string[];
  exportVersion: 1;
}>;

function assertBoundedIdentifier(value: string, name: string): void {
  if (value.trim().length === 0 || value.length > 200) throw new Error(`${name} must be a bounded identifier`);
}

export function assertServiceRequest(request: ServiceRequest): void {
  assertBoundedIdentifier(request.context.householdId, "householdId");
  assertBoundedIdentifier(request.operation.name, "operation name");
  if (request.operation.requiresIdempotency && request.idempotencyKey === undefined) {
    throw new Error("This operation requires an idempotency key");
  }
  if (request.idempotencyKey !== undefined) assertBoundedIdentifier(request.idempotencyKey, "idempotency key");
}

export function assertCanonicalReferenceVisible(
  context: ActiveHouseholdContext,
  reference: CanonicalReference,
): void {
  assertBoundedIdentifier(reference.type, "reference type");
  assertBoundedIdentifier(reference.id, "reference id");
  if (context.householdId !== reference.householdId) throw new Error("Cross-household reference access is denied");
}

export function acceptOutboxEvent(
  event: OutboxEvent,
  previouslyHandledEventIds: ReadonlySet<string>,
): { accepted: boolean; reason?: "duplicate" } {
  assertBoundedIdentifier(event.eventId, "event ID");
  if (event.aggregate.householdId !== event.householdId) {
    throw new Error("Event aggregate must match event household");
  }
  if (event.references.some((reference) => reference.householdId !== event.householdId)) {
    throw new Error("Event references must match event household");
  }
  return previouslyHandledEventIds.has(event.eventId) ? { accepted: false, reason: "duplicate" } : { accepted: true };
}
