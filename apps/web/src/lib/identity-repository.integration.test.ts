import { describe, expect, it } from "vitest";

const databaseUrl = process.env.LIFE_CHAT_INTEGRATION_DATABASE_URL;

describe.skipIf(databaseUrl === undefined)("identity repository integration", () => {
  it("writes household, member, audit, and outbox records together", async () => {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { bootstrapFirstOwner } = await import("./identity-repository");
    const database = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
    try {
      const subject = await database.user.create({ data: { id: "integration-subject", name: "Integration", email: "integration@example.test" } });
      const result = await bootstrapFirstOwner(database, { localOperatorConfirmed: true, subjectId: subject.id, householdName: "Integration", displayName: "Owner", now: new Date("2026-08-18T12:00:00.000Z") });
      expect(await database.member.count({ where: { householdId: result.household.householdId } })).toBe(1);
      expect(await database.auditEvent.count({ where: { householdId: result.household.householdId } })).toBe(1);
      expect(await database.outboxEvent.count({ where: { householdId: result.household.householdId } })).toBe(1);
    } finally { await database.$disconnect(); }
  });
});
