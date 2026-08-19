import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

const databaseUrl = process.env.LIFE_CHAT_INTEGRATION_DATABASE_URL;

describe.skipIf(databaseUrl === undefined)("family repository integration", () => {
  it("loads the household directory only for a current authorized adult", async () => {
    const { createPostgresAdapter } = await import("./postgres-adapter");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { loadFamilyDirectory } = await import("./family-repository");
    const database = new PrismaClient({ adapter: createPostgresAdapter(databaseUrl!) });
    try {
      const suffix = randomUUID();
      const now = new Date("2026-08-19T18:00:00Z");
      const household = await database.household.create({ data: { id: `family-household-${suffix}`, name: "Family home" } });
      const otherHousehold = await database.household.create({ data: { id: `family-other-${suffix}`, name: "Other home" } });
      const adultSubject = await database.user.create({ data: { id: `family-adult-subject-${suffix}`, name: "Adult", email: `family-adult-${suffix}@example.test` } });
      const childSubject = await database.user.create({ data: { id: `family-child-subject-${suffix}`, name: "Child", email: `family-child-${suffix}@example.test` } });
      const adult = await database.member.create({ data: { id: `family-adult-${suffix}`, householdId: household.id, authenticatedSubjectId: adultSubject.id, displayName: "Adult", role: "adult", lifecycle: "active" } });
      const child = await database.member.create({ data: { id: `family-child-${suffix}`, householdId: household.id, authenticatedSubjectId: childSubject.id, displayName: "Child", role: "child", lifecycle: "active" } });
      await database.member.create({ data: { id: `family-guest-${suffix}`, householdId: household.id, displayName: "Guest", role: "guest", lifecycle: "suspended", expiresAt: new Date("2026-08-18T18:00:00Z") } });
      await database.member.create({ data: { id: `family-other-member-${suffix}`, householdId: otherHousehold.id, displayName: "Other", role: "adult", lifecycle: "active" } });
      const actor = (subjectId: string, memberId: string) => ({ context: { authenticatedSubjectId: subjectId, memberId, householdId: household.id }, grants: [] });

      const adultDirectory = await loadFamilyDirectory(database, { actor: actor(adultSubject.id, adult.id), now });
      expect(adultDirectory.householdName).toBe("Family home");
      expect(adultDirectory.state.canManageMembers).toBe(true);
      expect(adultDirectory.state.members.map((member) => member.displayName).sort()).toEqual(["Adult", "Child", "Guest"]);
      expect(adultDirectory.state.members.some((member) => member.displayName === "Other")).toBe(false);

      const childDirectory = await loadFamilyDirectory(database, { actor: actor(childSubject.id, child.id), now });
      expect(childDirectory.state).toMatchObject({ canReadMembers: false, canManageMembers: false, members: [] });
      await database.member.update({ where: { id: adult.id }, data: { lifecycle: "suspended" } });
      await expect(loadFamilyDirectory(database, { actor: actor(adultSubject.id, adult.id), now })).rejects.toThrow();
    } finally {
      await database.$disconnect();
    }
  });
});
