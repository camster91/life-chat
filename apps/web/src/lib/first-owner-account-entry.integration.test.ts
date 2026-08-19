import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

const databaseUrl = process.env.LIFE_CHAT_BOOTSTRAP_DATABASE_URL;

describe.skipIf(databaseUrl === undefined)("first-owner account entry integration", () => {
  it("creates one provider-backed owner without a session and refuses replay", async () => {
    const { createPostgresAdapter } = await import("./postgres-adapter");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { bootstrapFirstOwnerAccount, FirstOwnerAccountEntryError } = await import("./first-owner-account-entry");
    const { createInvitationAccountProvisioner } = await import("./invitation-auth-core");
    const database = new PrismaClient({ adapter: createPostgresAdapter(databaseUrl!) });
    try {
      const suffix = randomUUID();
      const environment = {
        databaseUrl: databaseUrl!,
        betterAuthUrl: "http://127.0.0.1:3000",
        trustedOrigin: "http://127.0.0.1:3000",
        betterAuthSecret: "bootstrap-integration-secret-that-is-at-least-thirty-two-characters",
      };
      const requestHeaders = new Headers({ origin: environment.trustedOrigin, "user-agent": "bootstrap-integration" });
      const raceEmail = `first-owner-race-${suffix}@example.test`;
      const raceProvisioner = createInvitationAccountProvisioner({ database, environment, requestHeaders, establishSession: false });
      let rolledBackSubjectId = "";
      await expect(bootstrapFirstOwnerAccount(database, {
        localOperatorConfirmed: true,
        email: raceEmail,
        password: "bootstrap-password-123",
        householdName: "Lost race home",
        displayName: "Lost race owner",
        now: new Date("2026-08-19T17:59:00.000Z"),
        provisioner: {
          async create(input) {
            const provisioned = await raceProvisioner.create(input);
            rolledBackSubjectId = provisioned.subjectId;
            await database.household.create({ data: { id: `bootstrap-race-${suffix}`, name: "Competing setup" } });
            return provisioned;
          },
        },
      })).rejects.toThrow(FirstOwnerAccountEntryError);
      expect(await database.user.findUnique({ where: { id: rolledBackSubjectId } })).toBeNull();
      expect(await database.account.count({ where: { userId: rolledBackSubjectId } })).toBe(0);
      expect(await database.session.count({ where: { userId: rolledBackSubjectId } })).toBe(0);
      await database.household.delete({ where: { id: `bootstrap-race-${suffix}` } });

      const firstEmail = `first-owner-${suffix}@example.test`;
      const first = await bootstrapFirstOwnerAccount(database, {
        localOperatorConfirmed: true,
        email: firstEmail,
        password: "bootstrap-password-123",
        householdName: "First home",
        displayName: "First owner",
        now: new Date("2026-08-19T18:00:00.000Z"),
        provisioner: createInvitationAccountProvisioner({ database, environment, requestHeaders, establishSession: false }),
      });
      const user = await database.user.findUniqueOrThrow({ where: { email: firstEmail } });
      expect(first.owner).toMatchObject({ subjectId: user.id, role: "adult", lifecycle: "active" });
      expect(await database.session.count({ where: { userId: user.id } })).toBe(0);
      expect(await database.auditEvent.count({ where: { action: "household.bootstrap-first-owner", outcome: "succeeded" } })).toBe(1);
      expect(await database.outboxEvent.count({ where: { eventType: "household.bootstrap-first-owner.v1" } })).toBe(1);

      const replayEmail = `first-owner-replay-${suffix}@example.test`;
      await expect(bootstrapFirstOwnerAccount(database, {
        localOperatorConfirmed: true,
        email: replayEmail,
        password: "bootstrap-password-123",
        householdName: "Second home",
        displayName: "Second owner",
        now: new Date("2026-08-19T18:01:00.000Z"),
        provisioner: createInvitationAccountProvisioner({ database, environment, requestHeaders, establishSession: false }),
      })).rejects.toThrow(FirstOwnerAccountEntryError);
      expect(await database.user.findUnique({ where: { email: replayEmail } })).toBeNull();
      expect(await database.household.count()).toBe(1);
    } finally {
      await database.$disconnect();
    }
  });
});
