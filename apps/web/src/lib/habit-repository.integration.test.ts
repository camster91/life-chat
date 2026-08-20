import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

const databaseUrl = process.env.LIFE_CHAT_INTEGRATION_DATABASE_URL;

describe.skipIf(databaseUrl === undefined)("habit repository integration", () => {
  it("keeps routines and date-only completions scoped, replay-safe, and auditable", async () => {
    const { createPostgresAdapter } = await import("./postgres-adapter");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { setHouseholdMiniAppEnabled } = await import("./identity-repository");
    const { completeHabitRoutine, createHabitRoutine, HabitCommandError, HabitConflictError, loadPersistedHabitProgress } = await import("./habit-repository");
    const database = new PrismaClient({ adapter: createPostgresAdapter(databaseUrl!) });
    try {
      const suffix = randomUUID();
      const now = new Date("2026-08-20T01:30:00.000Z");
      const household = await database.household.create({ data: { id: `habits-household-${suffix}`, name: "Habits", timeZone: "America/Toronto" } });
      const otherHousehold = await database.household.create({ data: { id: `habits-other-household-${suffix}`, name: "Other" } });
      const adultSubject = await database.user.create({ data: { id: `habits-adult-subject-${suffix}`, name: "Adult", email: `habits-adult-${suffix}@example.test` } });
      const childSubject = await database.user.create({ data: { id: `habits-child-subject-${suffix}`, name: "Child", email: `habits-child-${suffix}@example.test` } });
      const guestSubject = await database.user.create({ data: { id: `habits-guest-subject-${suffix}`, name: "Guest", email: `habits-guest-${suffix}@example.test` } });
      const otherSubject = await database.user.create({ data: { id: `habits-other-subject-${suffix}`, name: "Other", email: `habits-other-${suffix}@example.test` } });
      const adult = await database.member.create({ data: { id: `habits-adult-${suffix}`, householdId: household.id, authenticatedSubjectId: adultSubject.id, displayName: "Adult", role: "adult", lifecycle: "active" } });
      const child = await database.member.create({ data: { id: `habits-child-${suffix}`, householdId: household.id, authenticatedSubjectId: childSubject.id, displayName: "Child", role: "child", lifecycle: "active" } });
      const guest = await database.member.create({ data: { id: `habits-guest-${suffix}`, householdId: household.id, authenticatedSubjectId: guestSubject.id, displayName: "Guest", role: "guest", lifecycle: "active" } });
      const other = await database.member.create({ data: { id: `habits-other-${suffix}`, householdId: otherHousehold.id, authenticatedSubjectId: otherSubject.id, displayName: "Other", role: "adult", lifecycle: "active" } });
      const actor = (subjectId: string, memberId: string, householdId = household.id) => ({ context: { authenticatedSubjectId: subjectId, memberId, householdId }, grants: [] });
      const adultActor = actor(adultSubject.id, adult.id);
      const childActor = actor(childSubject.id, child.id);
      const otherActor = actor(otherSubject.id, other.id, otherHousehold.id);

      await expect(createHabitRoutine(database, { actor: adultActor, label: "Drink water", commandId: `habit-${suffix}`, now })).rejects.toThrow(HabitCommandError);
      await setHouseholdMiniAppEnabled(database, { actor: adultActor, appId: "habits", enabled: true, expectedVersion: 0, commandId: `enable-habits-${suffix}`, now });
      await setHouseholdMiniAppEnabled(database, { actor: otherActor, appId: "habits", enabled: true, expectedVersion: 0, commandId: `enable-other-habits-${suffix}`, now });
      const routine = await createHabitRoutine(database, { actor: adultActor, label: "Drink water", commandId: `habit-${suffix}`, now });
      expect((await createHabitRoutine(database, { actor: adultActor, label: "Ignored replay", commandId: `habit-${suffix}`, now })).id).toBe(routine.id);
      await expect(createHabitRoutine(database, { actor: childActor, label: "Child setup", commandId: `child-habit-${suffix}`, now })).rejects.toThrow(HabitCommandError);
      expect(await loadPersistedHabitProgress(database, { actor: adultActor, now })).toMatchObject({ today: "2026-08-19", progress: [{ id: routine.id, completedToday: false, currentStreakDays: 0 }], canManage: true });
      expect(await loadPersistedHabitProgress(database, { actor: childActor, now })).toMatchObject({ today: "2026-08-19", progress: [], canManage: false });
      await expect(loadPersistedHabitProgress(database, { actor: actor(guestSubject.id, guest.id), now })).rejects.toThrow(HabitCommandError);
      const completion = await completeHabitRoutine(database, { actor: adultActor, routineId: routine.id, commandId: `complete-${suffix}`, now });
      expect(completion).toMatchObject({ routineId: routine.id, completionDate: "2026-08-19", completedByMemberId: adult.id });
      expect((await completeHabitRoutine(database, { actor: adultActor, routineId: routine.id, commandId: `complete-${suffix}`, now })).id).toBe(completion.id);
      await expect(completeHabitRoutine(database, { actor: adultActor, routineId: routine.id, commandId: `second-${suffix}`, now })).rejects.toThrow(HabitConflictError);
      await expect(completeHabitRoutine(database, { actor: childActor, routineId: routine.id, commandId: `child-complete-${suffix}`, now })).rejects.toThrow(HabitCommandError);
      await expect(completeHabitRoutine(database, { actor: otherActor, routineId: routine.id, commandId: `cross-complete-${suffix}`, now })).rejects.toThrow(HabitCommandError);
      expect(await loadPersistedHabitProgress(database, { actor: adultActor, now })).toMatchObject({ progress: [{ id: routine.id, completedToday: true, currentStreakDays: 1 }] });
      expect(await database.auditEvent.count({ where: { householdId: household.id, action: { startsWith: "habit." } } })).toBe(2);
      expect(await database.outboxEvent.count({ where: { householdId: household.id, eventType: { startsWith: "habit." } } })).toBe(2);
    } finally { await database.$disconnect(); }
  });
});
