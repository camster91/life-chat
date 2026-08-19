import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

const databaseUrl = process.env.LIFE_CHAT_INTEGRATION_DATABASE_URL;

describe.skipIf(databaseUrl === undefined)("calendar repository integration", () => {
  it("loads only household-visible and actor-owned records for eligible members", async () => {
    const { createPostgresAdapter } = await import("./postgres-adapter");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { CalendarAccessError, loadCalendarAgenda } = await import("./calendar-repository");
    const database = new PrismaClient({ adapter: createPostgresAdapter(databaseUrl!) });
    try {
      const suffix = randomUUID();
      const now = new Date("2026-08-19T16:00:00Z");
      const household = await database.household.create({ data: { id: `calendar-household-${suffix}`, name: "Calendar", timeZone: "America/Toronto" } });
      const otherHousehold = await database.household.create({ data: { id: `calendar-other-household-${suffix}`, name: "Other", timeZone: "Etc/UTC" } });
      const adultSubject = await database.user.create({ data: { id: `calendar-adult-subject-${suffix}`, name: "Adult", email: `calendar-adult-${suffix}@example.test` } });
      const childSubject = await database.user.create({ data: { id: `calendar-child-subject-${suffix}`, name: "Child", email: `calendar-child-${suffix}@example.test` } });
      const guestSubject = await database.user.create({ data: { id: `calendar-guest-subject-${suffix}`, name: "Guest", email: `calendar-guest-${suffix}@example.test` } });
      const adult = await database.member.create({ data: { id: `calendar-adult-${suffix}`, householdId: household.id, authenticatedSubjectId: adultSubject.id, displayName: "Adult", role: "adult", lifecycle: "active" } });
      const child = await database.member.create({ data: { id: `calendar-child-${suffix}`, householdId: household.id, authenticatedSubjectId: childSubject.id, displayName: "Child", role: "child", lifecycle: "active" } });
      const guest = await database.member.create({ data: { id: `calendar-guest-${suffix}`, householdId: household.id, authenticatedSubjectId: guestSubject.id, displayName: "Guest", role: "guest", lifecycle: "active" } });
      const records = await Promise.all([
        database.calendarItem.create({ data: { id: `calendar-household-item-${suffix}`, householdId: household.id, title: "School break", kind: "all_day", startDate: "2026-08-18", endDateExclusive: "2026-08-21" } }),
        database.calendarItem.create({ data: { id: `calendar-child-item-${suffix}`, householdId: household.id, ownerMemberId: child.id, title: "Child appointment", kind: "timed", visibility: "personal", startLocalDateTime: "2026-08-19T12:30", endLocalDateTime: "2026-08-19T13:00", timeZone: "America/Toronto", startInstant: new Date("2026-08-19T16:30:00Z"), endInstant: new Date("2026-08-19T17:00:00Z") } }),
        database.calendarItem.create({ data: { id: `calendar-adult-item-${suffix}`, householdId: household.id, ownerMemberId: adult.id, title: "Adult appointment", kind: "timed", visibility: "personal", startLocalDateTime: "2026-08-19T14:00", endLocalDateTime: "2026-08-19T15:00", timeZone: "America/Toronto", startInstant: new Date("2026-08-19T18:00:00Z"), endInstant: new Date("2026-08-19T19:00:00Z") } }),
        database.calendarItem.create({ data: { id: `calendar-other-item-${suffix}`, householdId: otherHousehold.id, title: "Other household", kind: "all_day", startDate: "2026-08-19", endDateExclusive: "2026-08-20" } }),
      ]);
      const actor = (subjectId: string, memberId: string) => ({ context: { authenticatedSubjectId: subjectId, memberId, householdId: household.id }, grants: [] });
      expect((await loadCalendarAgenda(database, { actor: actor(childSubject.id, child.id), date: "2026-08-19", now })).map((item) => item.id)).toEqual([records[0].id, records[1].id]);
      expect((await loadCalendarAgenda(database, { actor: actor(adultSubject.id, adult.id), date: "2026-08-19", now })).map((item) => item.id)).toEqual([records[0].id, records[2].id]);
      await expect(loadCalendarAgenda(database, { actor: actor(guestSubject.id, guest.id), date: "2026-08-19", now })).rejects.toThrow(CalendarAccessError);
      await database.member.update({ where: { id: child.id }, data: { lifecycle: "suspended" } });
      await expect(loadCalendarAgenda(database, { actor: actor(childSubject.id, child.id), date: "2026-08-19", now })).rejects.toThrow(CalendarAccessError);
    } finally {
      await database.$disconnect();
    }
  });

  it("enforces calendar record shape and same-household ownership in the database", async () => {
    const { createPostgresAdapter } = await import("./postgres-adapter");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const database = new PrismaClient({ adapter: createPostgresAdapter(databaseUrl!) });
    try {
      const suffix = randomUUID();
      const household = await database.household.create({ data: { id: `calendar-shape-${suffix}`, name: "Shape" } });
      const otherHousehold = await database.household.create({ data: { id: `calendar-shape-other-${suffix}`, name: "Other" } });
      const otherMember = await database.member.create({ data: { id: `calendar-shape-member-${suffix}`, householdId: otherHousehold.id, displayName: "Other", role: "adult", lifecycle: "active" } });
      await expect(database.calendarItem.create({ data: { householdId: household.id, title: "Invalid range", kind: "all_day", startDate: "2026-08-20", endDateExclusive: "2026-08-19" } })).rejects.toThrow();
      await expect(database.calendarItem.create({ data: { householdId: household.id, ownerMemberId: otherMember.id, title: "Cross household", kind: "all_day", visibility: "personal", startDate: "2026-08-19", endDateExclusive: "2026-08-20" } })).rejects.toThrow();
    } finally {
      await database.$disconnect();
    }
  });
});
