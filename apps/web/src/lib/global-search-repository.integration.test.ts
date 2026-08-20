import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

const databaseUrl = process.env.LIFE_CHAT_INTEGRATION_DATABASE_URL;

describe.skipIf(databaseUrl === undefined)("global search repository integration", () => {
  it("returns only records visible to the active member and omits guests", async () => {
    const { createPostgresAdapter } = await import("./postgres-adapter");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { searchAuthorizedRecords, SearchAccessError } = await import("./global-search-repository");
    const database = new PrismaClient({ adapter: createPostgresAdapter(databaseUrl!) });
    try {
      const suffix = randomUUID();
      const now = new Date("2026-08-20T12:00:00.000Z");
      const household = await database.household.create({ data: { id: `search-household-${suffix}`, name: "Search", timeZone: "America/Toronto" } });
      const otherHousehold = await database.household.create({ data: { id: `search-other-household-${suffix}`, name: "Other" } });
      const childSubject = await database.user.create({ data: { id: `search-child-subject-${suffix}`, name: "Child", email: `search-child-${suffix}@example.test` } });
      const adultSubject = await database.user.create({ data: { id: `search-adult-subject-${suffix}`, name: "Adult", email: `search-adult-${suffix}@example.test` } });
      const guestSubject = await database.user.create({ data: { id: `search-guest-subject-${suffix}`, name: "Guest", email: `search-guest-${suffix}@example.test` } });
      const child = await database.member.create({ data: { id: `search-child-${suffix}`, householdId: household.id, authenticatedSubjectId: childSubject.id, displayName: "Child", role: "child", lifecycle: "active" } });
      const adult = await database.member.create({ data: { id: `search-adult-${suffix}`, householdId: household.id, authenticatedSubjectId: adultSubject.id, displayName: "Adult", role: "adult", lifecycle: "active" } });
      const guest = await database.member.create({ data: { id: `search-guest-${suffix}`, householdId: household.id, authenticatedSubjectId: guestSubject.id, displayName: "Guest", role: "guest", lifecycle: "active" } });
      await database.householdMiniAppConfiguration.createMany({ data: [
        { householdId: household.id, appId: "chores", enabled: true },
        { householdId: household.id, appId: "shared-lists", enabled: true },
      ] });
      const list = await database.sharedList.create({ data: { id: `search-list-${suffix}`, householdId: household.id, title: "Dinner ideas" } });
      await Promise.all([
        database.sharedListItem.create({ data: { householdId: household.id, listId: list.id, label: "Dinner rolls", position: 0 } }),
        database.choreAssignment.create({ data: { householdId: household.id, assigneeMemberId: child.id, title: "Set dinner table" } }),
        database.calendarItem.create({ data: { householdId: household.id, title: "Dinner with family", kind: "all_day", startDate: "2026-08-20", endDateExclusive: "2026-08-21" } }),
        database.calendarItem.create({ data: { householdId: household.id, ownerMemberId: adult.id, visibility: "personal", title: "Dinner appointment", kind: "all_day", startDate: "2026-08-20", endDateExclusive: "2026-08-21" } }),
        database.calendarItem.create({ data: { householdId: otherHousehold.id, title: "Dinner elsewhere", kind: "all_day", startDate: "2026-08-20", endDateExclusive: "2026-08-21" } }),
      ]);
      const search = (subjectId: string, memberId: string) => searchAuthorizedRecords(database, { context: { authenticatedSubjectId: subjectId, memberId, householdId: household.id }, grants: [], query: "dinner", now });

      const childResults = await search(childSubject.id, child.id);
      expect(childResults.flatMap((group) => group.results.map((item) => item.title))).toEqual(expect.arrayContaining(["Dinner ideas", "Dinner rolls", "Set dinner table", "Dinner with family"]));
      expect(childResults.flatMap((group) => group.results.map((item) => item.title))).not.toContain("Dinner appointment");
      const adultResults = await search(adultSubject.id, adult.id);
      expect(adultResults.flatMap((group) => group.results.map((item) => item.title))).toContain("Dinner appointment");
      expect(adultResults.flatMap((group) => group.results.map((item) => item.title))).not.toContain("Set dinner table");
      await expect(search(guestSubject.id, guest.id)).rejects.toThrow(SearchAccessError);
    } finally {
      await database.$disconnect();
    }
  });
});
