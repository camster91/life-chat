import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

const databaseUrl = process.env.LIFE_CHAT_INTEGRATION_DATABASE_URL;

describe.skipIf(databaseUrl === undefined)("identity repository integration", () => {
  it("accepts an invitation once and writes the member, audit, and outbox records together", async () => {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { createInvitation } = await import("./invitation-contract");
    const { acceptHouseholdInvitation } = await import("./identity-repository");
    const database = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
    try {
      const suffix = randomUUID();
      const now = new Date("2026-08-18T12:00:00.000Z");
      const household = await database.household.create({ data: { id: `household-${suffix}`, name: "Integration" } });
      const issuerSubject = await database.user.create({ data: { id: `issuer-${suffix}`, name: "Issuer", email: `issuer-${suffix}@example.test` } });
      const invitedSubject = await database.user.create({ data: { id: `invited-${suffix}`, name: "Invited", email: `invited-${suffix}@example.test` } });
      const issuer = await database.member.create({ data: { id: `member-${suffix}`, householdId: household.id, authenticatedSubjectId: issuerSubject.id, displayName: "Issuer", role: "adult", lifecycle: "active" } });
      const created = createInvitation({ householdId: household.id, issuerMemberId: issuer.id, intendedRole: "child", intendedDisplayName: "Sam", expiresAt: new Date("2026-08-20T12:00:00.000Z"), now });
      await database.invitation.create({ data: { id: created.invitation.invitationId, householdId: household.id, issuerMemberId: issuer.id, tokenHash: created.invitation.tokenHash, intendedRole: created.invitation.intendedRole, intendedDisplayName: created.invitation.intendedDisplayName, expiresAt: created.invitation.expiresAt } });

      const accepted = await acceptHouseholdInvitation(database, { token: created.token, subjectId: invitedSubject.id, now });
      const invitation = await database.invitation.findUniqueOrThrow({ where: { id: accepted.invitationId } });
      expect(invitation.acceptedMemberId).toBe(accepted.member.memberId);
      expect(await database.member.count({ where: { householdId: household.id } })).toBe(2);
      expect(await database.auditEvent.count({ where: { householdId: household.id, action: "identity.invitation.accept" } })).toBe(1);
      expect(await database.outboxEvent.count({ where: { householdId: household.id, eventType: "identity.invitation-accepted.v1" } })).toBe(1);
      await expect(acceptHouseholdInvitation(database, { token: created.token, subjectId: invitedSubject.id, now })).rejects.toThrow("Invitation has already been accepted.");
      expect(await database.member.count({ where: { householdId: household.id } })).toBe(2);
    } finally { await database.$disconnect(); }
  });
});
