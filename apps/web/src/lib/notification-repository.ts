import type { PrismaClient } from "../../generated/prisma/client";
import { createAuditEvent, createDomainEvent, newCorrelationId } from "./audit-event";
import type { ActiveHouseholdContext } from "./identity-context";
import { createNotificationInbox, type InboxNotification } from "./notification-centre";
import type { Notification } from "./notification";
import { authorize, type CapabilityGrant } from "./permission-engine";

export class NotificationCommandError extends Error {}

function toNotification(record: {
  id: string; householdId: string; recipientMemberId: string; templateId: string; sourceEventId: string;
  references: unknown; deduplicationKey: string; deliverAt: Date; state: Notification["state"]; deepLink: string | null;
}): Notification {
  return {
    id: record.id, householdId: record.householdId, recipientMemberId: record.recipientMemberId,
    templateId: record.templateId, sourceEventId: record.sourceEventId,
    references: record.references as Readonly<Record<string, string>>, deduplicationKey: record.deduplicationKey,
    deliverAt: record.deliverAt.toISOString(), state: record.state,
    ...(record.deepLink === null ? {} : { deepLink: record.deepLink }),
  };
}

export async function loadNotificationInbox(database: PrismaClient, context: ActiveHouseholdContext): Promise<readonly InboxNotification[]> {
  const records = await database.notificationEnvelope.findMany({
    where: { householdId: context.householdId, recipientMemberId: context.memberId, state: { in: ["available", "read"] } },
    orderBy: { deliverAt: "desc" }, take: 100,
  });
  return createNotificationInbox({ context, notifications: records.map(toNotification) });
}

/** Marks only the active recipient's available notification as read. */
export async function markNotificationRead(database: PrismaClient, input: {
  context: ActiveHouseholdContext; grants: readonly CapabilityGrant[]; notificationId: string; now: Date;
}) {
  return database.$transaction(async (transaction) => {
    const member = await transaction.member.findFirst({ where: {
      id: input.context.memberId, householdId: input.context.householdId,
      authenticatedSubjectId: input.context.authenticatedSubjectId, lifecycle: "active",
      OR: [{ expiresAt: null }, { expiresAt: { gt: input.now } }],
    } });
    if (member === null) throw new NotificationCommandError("The active member is no longer eligible.");
    const decision = authorize({ context: input.context, role: member.role, grants: input.grants, request: { householdId: member.householdId, permission: "notification.manage-self" }, now: input.now });
    if (!decision.allowed) throw new NotificationCommandError("Notification update is not authorized.");
    const current = await transaction.notificationEnvelope.findFirst({ where: { id: input.notificationId, householdId: member.householdId, recipientMemberId: member.id } });
    if (current === null) throw new NotificationCommandError("The notification is not available to this member.");
    if (current.state === "read") return current;
    if (current.state !== "available") throw new NotificationCommandError("Only an available notification may be marked read.");

    const changed = await transaction.notificationEnvelope.updateMany({
      where: { id: current.id, householdId: member.householdId, recipientMemberId: member.id, state: "available" },
      data: { state: "read", readAt: input.now },
    });
    if (changed.count !== 1) throw new NotificationCommandError("Notification state changed; reload the inbox.");
    const correlationId = newCorrelationId();
    const audit = createAuditEvent({ householdId: member.householdId, actor: { type: "member", id: member.id }, action: "notification.read", target: { type: "notification", id: current.id }, outcome: "succeeded", correlationId, causationId: null, occurredAt: input.now.toISOString(), metadata: {} });
    const event = createDomainEvent({ householdId: member.householdId, aggregate: { type: "notification", id: current.id }, type: "notification.read.v1", correlationId, causationId: audit.id, occurredAt: input.now.toISOString(), references: { recipientMemberId: member.id } });
    await transaction.auditEvent.create({ data: { id: audit.id, householdId: audit.householdId, actorType: audit.actor.type, actorId: audit.actor.id, action: audit.action, targetType: audit.target.type, targetId: audit.target.id, outcome: audit.outcome, correlationId: audit.correlationId, causationId: audit.causationId, metadata: audit.metadata, occurredAt: new Date(audit.occurredAt) } });
    await transaction.outboxEvent.create({ data: { id: event.id, householdId: event.householdId, aggregateType: event.aggregate.type, aggregateId: event.aggregate.id, eventType: event.type, schemaVersion: event.schemaVersion, correlationId: event.correlationId, causationId: event.causationId, references: event.references, occurredAt: new Date(event.occurredAt) } });
    return transaction.notificationEnvelope.findUniqueOrThrow({ where: { id: current.id } });
  }, { isolationLevel: "Serializable" });
}
