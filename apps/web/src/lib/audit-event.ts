import { randomUUID } from "node:crypto";

export type AuditOutcome = "succeeded" | "denied" | "failed";
export type AuditActor = { type: "member" | "subject" | "system" | "integration"; id: string };
export type SafeAuditMetadata = Readonly<Record<string, string | number | boolean | null>>;

export type AuditEvent = {
  id: string;
  occurredAt: string;
  householdId: string;
  actor: AuditActor;
  action: string;
  target: { type: string; id: string };
  outcome: AuditOutcome;
  correlationId: string;
  causationId: string | null;
  metadata: SafeAuditMetadata;
};

export type DomainEvent = {
  id: string;
  schemaVersion: 1;
  occurredAt: string;
  householdId: string;
  aggregate: { type: string; id: string };
  type: string;
  correlationId: string;
  causationId: string | null;
  references: Readonly<Record<string, string>>;
};

const forbiddenMetadataKey = /(password|secret|token|authorization|cookie|session|prompt|message|body|attachment|content|email|phone|card|credential|api.?key)/i;
const controlCharacters = /[\r\n\u0000]/;

function assertOpaqueId(value: string, name: string): void {
  if (value.trim().length === 0 || value.length > 200) throw new RangeError(`${name} must be a bounded opaque identifier.`);
}

function safeMetadata(metadata: SafeAuditMetadata): SafeAuditMetadata {
  for (const [key, value] of Object.entries(metadata)) {
    if (forbiddenMetadataKey.test(key)) throw new RangeError(`Audit metadata key '${key}' is not allowed.`);
    if (typeof value === "string" && (value.length > 256 || controlCharacters.test(value))) {
      throw new RangeError(`Audit metadata value for '${key}' must be bounded and control-character free.`);
    }
  }
  return Object.freeze({ ...metadata });
}

function safeReferences(references: Readonly<Record<string, string>>): Readonly<Record<string, string>> {
  for (const [key, value] of Object.entries(references)) {
    if (forbiddenMetadataKey.test(key)) throw new RangeError(`Domain event reference key '${key}' is not allowed.`);
    assertOpaqueId(value, `reference '${key}'`);
  }
  return Object.freeze({ ...references });
}

export function newCorrelationId(): string {
  return randomUUID();
}

export function createAuditEvent(input: Omit<AuditEvent, "id" | "occurredAt" | "metadata"> & { metadata?: SafeAuditMetadata; occurredAt?: string }): AuditEvent {
  assertOpaqueId(input.householdId, "householdId");
  assertOpaqueId(input.actor.id, "actor.id");
  assertOpaqueId(input.action, "action");
  assertOpaqueId(input.target.type, "target.type");
  assertOpaqueId(input.target.id, "target.id");
  assertOpaqueId(input.correlationId, "correlationId");
  return Object.freeze({
    id: randomUUID(),
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    householdId: input.householdId,
    actor: Object.freeze({ ...input.actor }),
    action: input.action,
    target: Object.freeze({ ...input.target }),
    outcome: input.outcome,
    correlationId: input.correlationId,
    causationId: input.causationId,
    metadata: safeMetadata(input.metadata ?? {}),
  });
}

export function createDomainEvent(input: Omit<DomainEvent, "id" | "occurredAt" | "schemaVersion"> & { occurredAt?: string }): DomainEvent {
  assertOpaqueId(input.householdId, "householdId");
  assertOpaqueId(input.aggregate.type, "aggregate.type");
  assertOpaqueId(input.aggregate.id, "aggregate.id");
  assertOpaqueId(input.type, "type");
  assertOpaqueId(input.correlationId, "correlationId");
  return Object.freeze({
    id: randomUUID(),
    schemaVersion: 1,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    householdId: input.householdId,
    aggregate: Object.freeze({ ...input.aggregate }),
    type: input.type,
    correlationId: input.correlationId,
    causationId: input.causationId,
    references: safeReferences(input.references),
  });
}
