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

  it("denies removing the final adult and audits a permitted lifecycle change", async () => {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { changeMemberLifecycle, MemberLifecycleError } = await import("./identity-repository");
    const database = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
    try {
      const suffix = randomUUID();
      const now = new Date("2026-08-18T12:00:00.000Z");
      const household = await database.household.create({ data: { id: `lifecycle-household-${suffix}`, name: "Lifecycle" } });
      const firstSubject = await database.user.create({ data: { id: `lifecycle-first-${suffix}`, name: "First", email: `lifecycle-first-${suffix}@example.test` } });
      const secondSubject = await database.user.create({ data: { id: `lifecycle-second-${suffix}`, name: "Second", email: `lifecycle-second-${suffix}@example.test` } });
      const firstAdult = await database.member.create({ data: { id: `lifecycle-member-first-${suffix}`, householdId: household.id, authenticatedSubjectId: firstSubject.id, displayName: "First", role: "adult", lifecycle: "active" } });
      const secondAdult = await database.member.create({ data: { id: `lifecycle-member-second-${suffix}`, householdId: household.id, authenticatedSubjectId: secondSubject.id, displayName: "Second", role: "adult", lifecycle: "active" } });
      const actor = { context: { authenticatedSubjectId: firstSubject.id, memberId: firstAdult.id, householdId: household.id }, role: "adult" as const, grants: [] };

      await changeMemberLifecycle(database, { actor, targetMemberId: secondAdult.id, lifecycle: "suspended", now });
      expect(await database.member.findUniqueOrThrow({ where: { id: secondAdult.id } })).toMatchObject({ lifecycle: "suspended" });
      expect(await database.auditEvent.count({ where: { householdId: household.id, action: "identity.member.suspended" } })).toBe(1);
      expect(await database.outboxEvent.count({ where: { householdId: household.id, eventType: "identity.member-suspended.v1" } })).toBe(1);
      await expect(changeMemberLifecycle(database, { actor, targetMemberId: firstAdult.id, lifecycle: "removed", now })).rejects.toThrow(MemberLifecycleError);
      expect(await database.member.findUniqueOrThrow({ where: { id: firstAdult.id } })).toMatchObject({ lifecycle: "active" });
    } finally { await database.$disconnect(); }
  });
});
