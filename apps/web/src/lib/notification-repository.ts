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

/** Releases due envelopes to the in-app inbox after rechecking recipient eligibility. */
export async function releaseDueNotifications(database: PrismaClient, input: { now: Date; limit?: number }) {
  const limit = input.limit ?? 100;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new NotificationCommandError("Notification release limit must be between 1 and 100.");
  return database.$transaction(async (transaction) => {
    const due = await transaction.notificationEnvelope.findMany({
      where: { state: "scheduled", deliverAt: { lte: input.now } },
      include: { recipient: true }, orderBy: { deliverAt: "asc" }, take: limit,
    });
    let available = 0;
    let cancelled = 0;
    for (const notification of due) {
      const eligible = notification.recipient.householdId === notification.householdId
        && notification.recipient.lifecycle === "active"
        && (notification.recipient.expiresAt === null || notification.recipient.expiresAt > input.now);
      const nextState = eligible ? "available" as const : "cancelled" as const;
      const changed = await transaction.notificationEnvelope.updateMany({ where: { id: notification.id, state: "scheduled" }, data: { state: nextState } });
      if (changed.count !== 1) continue;
      if (eligible) available += 1; else cancelled += 1;
      const correlationId = newCorrelationId();
      const audit = createAuditEvent({ householdId: notification.householdId, actor: { type: "system", id: "notification-release-worker" }, action: eligible ? "notification.available" : "notification.cancel", target: { type: "notification", id: notification.id }, outcome: "succeeded", correlationId, causationId: notification.sourceEventId, occurredAt: input.now.toISOString(), metadata: { reason: eligible ? "deliver-at-reached" : "recipient-ineligible" } });
      const event = createDomainEvent({ householdId: notification.householdId, aggregate: { type: "notification", id: notification.id }, type: eligible ? "notification.available.v1" : "notification.cancelled.v1", correlationId, causationId: audit.id, occurredAt: input.now.toISOString(), references: { recipientMemberId: notification.recipientMemberId } });
      await transaction.auditEvent.create({ data: { id: audit.id, householdId: audit.householdId, actorType: audit.actor.type, actorId: audit.actor.id, action: audit.action, targetType: audit.target.type, targetId: audit.target.id, outcome: audit.outcome, correlationId: audit.correlationId, causationId: audit.causationId, metadata: audit.metadata, occurredAt: new Date(audit.occurredAt) } });
      await transaction.outboxEvent.create({ data: { id: event.id, householdId: event.householdId, aggregateType: event.aggregate.type, aggregateId: event.aggregate.id, eventType: event.type, schemaVersion: event.schemaVersion, correlationId: event.correlationId, causationId: event.causationId, references: event.references, occurredAt: new Date(event.occurredAt) } });
    }
    return { available, cancelled };
  }, { isolationLevel: "Serializable" });
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
