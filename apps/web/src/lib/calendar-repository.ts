import { Temporal } from "@js-temporal/polyfill";
import type { PrismaClient } from "../../generated/prisma/client";
import { createAuditEvent, createDomainEvent, newCorrelationId } from "./audit-event";
import { createCalendarAgenda, type CalendarAgendaItem } from "./calendar-agenda";
import { assertIanaTimeZone, parseDateOnly, type DateOnly } from "./date-time";
import type { ActiveHouseholdContext } from "./identity-context";
import { authorize, type CapabilityGrant } from "./permission-engine";

export class CalendarAccessError extends Error {}
export class CalendarCommandError extends Error {}

function boundedText(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 200 || /[\r\n\u0000]/.test(normalized)) throw new CalendarCommandError(`${field} must be 1–200 characters without control characters.`);
  return normalized;
}

function boundedCommandId(value: string): string {
  if (value.trim().length === 0 || value.length > 200) throw new CalendarCommandError("commandId must be a bounded opaque identifier.");
  return value;
}

async function authorizeCalendarAccess(database: PrismaClient, input: {
  actor: { context: ActiveHouseholdContext; grants: readonly CapabilityGrant[] };
  permission: "calendar.read" | "calendar.manage";
  now: Date;
}) {
  const member = await database.member.findFirst({
    where: {
      id: input.actor.context.memberId,
      householdId: input.actor.context.householdId,
      authenticatedSubjectId: input.actor.context.authenticatedSubjectId,
      lifecycle: "active",
      OR: [{ expiresAt: null }, { expiresAt: { gt: input.now } }],
    },
    include: { household: { select: { timeZone: true } } },
  });
  if (member === null || member.role === "guest") throw new CalendarAccessError("Calendar is not available to this household member.");
  const decision = authorize({ context: input.actor.context, role: member.role, grants: input.actor.grants, request: { householdId: member.householdId, permission: input.permission }, now: input.now });
  if (!decision.allowed) throw new CalendarAccessError("Calendar is not available to this household member.");
  return member;
}

function canonicalInstant(date: Date): string {
  return Temporal.Instant.from(date.toISOString()).toString();
}

export async function loadCalendarAgenda(database: PrismaClient, input: {
  actor: { context: ActiveHouseholdContext; grants: readonly CapabilityGrant[] };
  date: DateOnly;
  now: Date;
}) {
  parseDateOnly(input.date);
  return database.$transaction(async (transaction) => {
    const member = await authorizeCalendarAccess(transaction as PrismaClient, { actor: input.actor, permission: "calendar.read", now: input.now });

    const householdTimeZone = assertIanaTimeZone(member.household.timeZone);
    const dayStart = Temporal.PlainDate.from(input.date).toZonedDateTime(householdTimeZone).toInstant();
    const dayEnd = Temporal.PlainDate.from(input.date).add({ days: 1 }).toZonedDateTime(householdTimeZone).toInstant();
    const records = await transaction.calendarItem.findMany({
      where: {
        householdId: member.householdId,
        archivedAt: null,
        OR: [
          { visibility: "household" },
          { visibility: "personal", ownerMemberId: member.id },
        ],
        AND: [{ OR: [
          { kind: "all_day", startDate: { lte: input.date }, endDateExclusive: { gt: input.date } },
          { kind: "timed", startInstant: { lt: new Date(dayEnd.epochMilliseconds) }, endInstant: { gt: new Date(dayStart.epochMilliseconds) } },
        ] }],
      },
      orderBy: [{ startDate: "asc" }, { startInstant: "asc" }, { title: "asc" }, { id: "asc" }],
    });

    const items: CalendarAgendaItem[] = records.map((record) => ({
      id: record.id,
      householdId: record.householdId,
      title: record.title,
      deepLink: `/calendar?date=${encodeURIComponent(input.date)}#calendar-item-${encodeURIComponent(record.id)}`,
      kind: record.kind === "all_day" ? "all-day" : "timed",
      startDate: record.startDate,
      endDateExclusive: record.endDateExclusive,
      localStart: record.startLocalDateTime,
      localEnd: record.endLocalDateTime,
      eventTimeZone: record.timeZone,
      startInstant: record.startInstant === null ? null : canonicalInstant(record.startInstant),
      endInstant: record.endInstant === null ? null : canonicalInstant(record.endInstant),
      authorized: true,
    }));
    return createCalendarAgenda({ context: input.actor.context, householdTimeZone, date: input.date, items });
  }, { isolationLevel: "Serializable" });
}

export async function createAllDayCalendarItem(database: PrismaClient, input: {
  actor: { context: ActiveHouseholdContext; grants: readonly CapabilityGrant[] };
  title: string;
  date: DateOnly;
  commandId: string;
  now: Date;
}) {
  const title = boundedText(input.title, "title");
  const startDate = parseDateOnly(input.date).toString();
  const commandId = boundedCommandId(input.commandId);
  return database.$transaction(async (transaction) => {
    const member = await authorizeCalendarAccess(transaction as PrismaClient, { actor: input.actor, permission: "calendar.manage", now: input.now });
    const existing = await transaction.calendarItem.findUnique({ where: { creationCommandId: commandId } });
    if (existing !== null) {
      if (existing.householdId !== member.householdId || existing.kind !== "all_day" || existing.visibility !== "household") throw new CalendarCommandError("commandId cannot cross calendar record boundaries.");
      return existing;
    }
    const endDateExclusive = Temporal.PlainDate.from(startDate).add({ days: 1 }).toString();
    const item = await transaction.calendarItem.create({ data: { householdId: member.householdId, title, kind: "all_day", visibility: "household", startDate, endDateExclusive, creationCommandId: commandId } });
    const correlationId = newCorrelationId();
    const auditEvent = createAuditEvent({ householdId: member.householdId, actor: { type: "member", id: member.id }, action: "calendar.create", target: { type: "calendar-item", id: item.id }, outcome: "succeeded", correlationId, causationId: null, occurredAt: input.now.toISOString(), metadata: { kind: "all-day", startDate } });
    const domainEvent = createDomainEvent({ householdId: member.householdId, aggregate: { type: "calendar-item", id: item.id }, type: "calendar.created.v1", correlationId, causationId: auditEvent.id, occurredAt: input.now.toISOString(), references: { kind: "all-day", startDate } });
    await transaction.auditEvent.create({ data: { id: auditEvent.id, householdId: auditEvent.householdId, actorType: auditEvent.actor.type, actorId: auditEvent.actor.id, action: auditEvent.action, targetType: auditEvent.target.type, targetId: auditEvent.target.id, outcome: auditEvent.outcome, correlationId: auditEvent.correlationId, causationId: auditEvent.causationId, metadata: auditEvent.metadata, occurredAt: new Date(auditEvent.occurredAt) } });
    await transaction.outboxEvent.create({ data: { id: domainEvent.id, householdId: domainEvent.householdId, aggregateType: domainEvent.aggregate.type, aggregateId: domainEvent.aggregate.id, eventType: domainEvent.type, schemaVersion: domainEvent.schemaVersion, correlationId: domainEvent.correlationId, causationId: domainEvent.causationId, references: domainEvent.references, occurredAt: new Date(domainEvent.occurredAt) } });
    return item;
  }, { isolationLevel: "Serializable" });
}
