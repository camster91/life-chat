import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

const databaseUrl = process.env.LIFE_CHAT_INTEGRATION_DATABASE_URL;

describe.skipIf(databaseUrl === undefined)("grocery repository integration", () => {
  it("creates only eligible household grocery-purpose shared lists", async () => {
    const { createPostgresAdapter } = await import("./postgres-adapter");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { setHouseholdMiniAppEnabled } = await import("./identity-repository");
    const { createGroceryList, GroceryCommandError, loadGroceryLists } = await import("./grocery-repository");
    const database = new PrismaClient({ adapter: createPostgresAdapter(databaseUrl!) });
    try {
      const suffix = randomUUID(); const now = new Date("2026-08-21T12:00:00.000Z");
      const household = await database.household.create({ data: { id: `groceries-household-${suffix}`, name: "Groceries" } });
      const otherHousehold = await database.household.create({ data: { id: `groceries-other-household-${suffix}`, name: "Other" } });
      const adultSubject = await database.user.create({ data: { id: `groceries-adult-subject-${suffix}`, name: "Adult", email: `groceries-adult-${suffix}@example.test` } });
      const childSubject = await database.user.create({ data: { id: `groceries-child-subject-${suffix}`, name: "Child", email: `groceries-child-${suffix}@example.test` } });
      const otherSubject = await database.user.create({ data: { id: `groceries-other-subject-${suffix}`, name: "Other", email: `groceries-other-${suffix}@example.test` } });
      const adult = await database.member.create({ data: { id: `groceries-adult-${suffix}`, householdId: household.id, authenticatedSubjectId: adultSubject.id, displayName: "Adult", role: "adult", lifecycle: "active" } });
      const child = await database.member.create({ data: { id: `groceries-child-${suffix}`, householdId: household.id, authenticatedSubjectId: childSubject.id, displayName: "Child", role: "child", lifecycle: "active" } });
      const other = await database.member.create({ data: { id: `groceries-other-${suffix}`, householdId: otherHousehold.id, authenticatedSubjectId: otherSubject.id, displayName: "Other", role: "adult", lifecycle: "active" } });
      const actor = (subjectId: string, memberId: string, householdId = household.id) => ({ context: { authenticatedSubjectId: subjectId, memberId, householdId }, grants: [] });
      const adultActor = actor(adultSubject.id, adult.id); const childActor = actor(childSubject.id, child.id); const otherActor = actor(otherSubject.id, other.id, otherHousehold.id);
      await setHouseholdMiniAppEnabled(database, { actor: adultActor, appId: "shared-lists", enabled: true, expectedVersion: 0, commandId: `enable-lists-${suffix}`, now });
      await expect(createGroceryList(database, { actor: adultActor, title: "Weekly shop", commandId: `grocery-${suffix}`, now })).rejects.toThrow(GroceryCommandError);
      await setHouseholdMiniAppEnabled(database, { actor: adultActor, appId: "groceries", enabled: true, expectedVersion: 0, commandId: `enable-groceries-${suffix}`, now });
      await setHouseholdMiniAppEnabled(database, { actor: otherActor, appId: "shared-lists", enabled: true, expectedVersion: 0, commandId: `enable-other-lists-${suffix}`, now });
      await setHouseholdMiniAppEnabled(database, { actor: otherActor, appId: "groceries", enabled: true, expectedVersion: 0, commandId: `enable-other-groceries-${suffix}`, now });
      const grocery = await createGroceryList(database, { actor: adultActor, title: "Weekly shop", commandId: `grocery-${suffix}`, now });
      expect(grocery).toMatchObject({ householdId: household.id, purpose: "grocery", title: "Weekly shop" });
      expect((await createGroceryList(database, { actor: adultActor, title: "Ignored replay", commandId: `grocery-${suffix}`, now })).id).toBe(grocery.id);
      await expect(createGroceryList(database, { actor: childActor, title: "Blocked", commandId: `child-grocery-${suffix}`, now })).rejects.toThrow(GroceryCommandError);
      expect(await loadGroceryLists(database, { actor: childActor, now })).toMatchObject({ lists: [{ id: grocery.id }], canManage: false });
      expect(await loadGroceryLists(database, { actor: otherActor, now })).toMatchObject({ lists: [] });
      expect(await database.auditEvent.count({ where: { householdId: household.id, action: "shared-list.create", targetId: grocery.id } })).toBe(1);
      expect(await database.outboxEvent.count({ where: { householdId: household.id, eventType: "shared-list.created.v1", aggregateId: grocery.id } })).toBe(1);
    } finally { await database.$disconnect(); }
  });
});
