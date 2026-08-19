import type { PrismaClient } from "../../generated/prisma/client";
import { createAuditEvent, createDomainEvent, newCorrelationId } from "./audit-event";
import type { ActiveHouseholdContext } from "./identity-context";
import { createNotificationPreference, type NotificationPreference } from "./notification-preference";
import { authorize, type CapabilityGrant } from "./permission-engine";

export class NotificationPreferenceCommandError extends Error {}

function toPreference(record: {
  householdId: string;
  memberId: string;
  remindersEnabled: boolean;
  quietHoursStartMinute: number | null;
  quietHoursEndMinute: number | null;
  timeZone: string;
}): NotificationPreference {
  const hasQuietHours = record.quietHoursStartMinute !== null && record.quietHoursEndMinute !== null;
  return createNotificationPreference({
    householdId: record.householdId,
    memberId: record.memberId,
    remindersEnabled: record.remindersEnabled,
    quietHours: hasQuietHours
      ? { startMinute: record.quietHoursStartMinute!, endMinute: record.quietHoursEndMinute! }
      : null,
    timeZone: record.timeZone,
  });
}

async function loadAuthorizedMember(database: PrismaClient, input: {
  context: ActiveHouseholdContext;
  grants: readonly CapabilityGrant[];
  now: Date;
}) {
  const member = await database.member.findFirst({ where: {
    id: input.context.memberId,
    householdId: input.context.householdId,
    authenticatedSubjectId: input.context.authenticatedSubjectId,
    lifecycle: "active",
    OR: [{ expiresAt: null }, { expiresAt: { gt: input.now } }],
  } });
  if (member === null) throw new NotificationPreferenceCommandError("The active member is no longer eligible.");
  const decision = authorize({
    context: input.context,
    role: member.role,
    grants: input.grants,
    request: { householdId: member.householdId, permission: "notification.manage-self" },
    now: input.now,
  });
  if (!decision.allowed) throw new NotificationPreferenceCommandError("Notification preferences are not authorized.");
  return member;
}

export async function loadNotificationPreference(database: PrismaClient, input: {
  context: ActiveHouseholdContext;
  grants: readonly CapabilityGrant[];
  now: Date;
}): Promise<NotificationPreference | null> {
  const member = await loadAuthorizedMember(database, input);
  const record = await database.notificationPreference.findUnique({
    where: { householdId_memberId: { householdId: member.householdId, memberId: member.id } },
  });
  return record === null ? null : toPreference(record);
}

export async function saveNotificationPreference(database: PrismaClient, input: {
  context: ActiveHouseholdContext;
  grants: readonly CapabilityGrant[];
  remindersEnabled: boolean;
  quietHours: NotificationPreference["quietHours"];
  timeZone: string;
  now: Date;
}) {
  const preference = createNotificationPreference({
    householdId: input.context.householdId,
    memberId: input.context.memberId,
    remindersEnabled: input.remindersEnabled,
    quietHours: input.quietHours,
    timeZone: input.timeZone,
  });
  return database.$transaction(async (transaction) => {
    const member = await loadAuthorizedMember(transaction as PrismaClient, input);
    const saved = await transaction.notificationPreference.upsert({
      where: { householdId_memberId: { householdId: member.householdId, memberId: member.id } },
      create: {
        householdId: member.householdId,
        memberId: member.id,
        remindersEnabled: preference.remindersEnabled,
        quietHoursStartMinute: preference.quietHours?.startMinute,
        quietHoursEndMinute: preference.quietHours?.endMinute,
        timeZone: preference.timeZone,
      },
      update: {
        remindersEnabled: preference.remindersEnabled,
        quietHoursStartMinute: preference.quietHours?.startMinute ?? null,
        quietHoursEndMinute: preference.quietHours?.endMinute ?? null,
        timeZone: preference.timeZone,
      },
    });
    const correlationId = newCorrelationId();
    const audit = createAuditEvent({
      householdId: member.householdId,
      actor: { type: "member", id: member.id },
      action: "notification.preference.update",
      target: { type: "notification-preference", id: member.id },
      outcome: "succeeded",
      correlationId,
      causationId: null,
      occurredAt: input.now.toISOString(),
      metadata: {
        remindersEnabled: preference.remindersEnabled,
        quietHoursEnabled: preference.quietHours !== null,
        timeZone: preference.timeZone,
      },
    });
    const event = createDomainEvent({
      householdId: member.householdId,
      aggregate: { type: "notification-preference", id: member.id },
      type: "notification.preference.updated.v1",
      correlationId,
      causationId: audit.id,
      occurredAt: input.now.toISOString(),
      references: { memberId: member.id },
    });
    await transaction.auditEvent.create({ data: { id: audit.id, householdId: audit.householdId, actorType: audit.actor.type, actorId: audit.actor.id, action: audit.action, targetType: audit.target.type, targetId: audit.target.id, outcome: audit.outcome, correlationId: audit.correlationId, causationId: audit.causationId, metadata: audit.metadata, occurredAt: new Date(audit.occurredAt) } });
    await transaction.outboxEvent.create({ data: { id: event.id, householdId: event.householdId, aggregateType: event.aggregate.type, aggregateId: event.aggregate.id, eventType: event.type, schemaVersion: event.schemaVersion, correlationId: event.correlationId, causationId: event.causationId, references: event.references, occurredAt: new Date(event.occurredAt) } });
    return toPreference(saved);
  }, { isolationLevel: "Serializable" });
}
