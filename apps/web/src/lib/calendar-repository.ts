import { Temporal } from "@js-temporal/polyfill";
import type { PrismaClient } from "../../generated/prisma/client";
import { createCalendarAgenda, type CalendarAgendaItem } from "./calendar-agenda";
import { assertIanaTimeZone, parseDateOnly, type DateOnly } from "./date-time";
import type { ActiveHouseholdContext } from "./identity-context";
import { authorize, type CapabilityGrant } from "./permission-engine";

export class CalendarAccessError extends Error {}

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
    const member = await transaction.member.findFirst({
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
    const decision = authorize({ context: input.actor.context, role: member.role, grants: input.actor.grants, request: { householdId: member.householdId, permission: "calendar.read" }, now: input.now });
    if (!decision.allowed) throw new CalendarAccessError("Calendar is not available to this household member.");

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
