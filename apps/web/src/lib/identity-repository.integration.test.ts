import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

const databaseUrl = process.env.LIFE_CHAT_INTEGRATION_DATABASE_URL;

describe.skipIf(databaseUrl === undefined)("identity repository integration", () => {
  it("accepts an invitation once and writes the member, audit, and outbox records together", async () => {
    const { createPostgresAdapter } = await import("./postgres-adapter");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { acceptHouseholdInvitation, issueHouseholdInvitation } = await import("./identity-repository");
    const database = new PrismaClient({ adapter: createPostgresAdapter(databaseUrl!) });
    try {
      const suffix = randomUUID();
      const now = new Date("2026-08-18T12:00:00.000Z");
      const household = await database.household.create({ data: { id: `household-${suffix}`, name: "Integration" } });
      const issuerSubject = await database.user.create({ data: { id: `issuer-${suffix}`, name: "Issuer", email: `issuer-${suffix}@example.test` } });
      const invitedSubject = await database.user.create({ data: { id: `invited-${suffix}`, name: "Invited", email: `invited-${suffix}@example.test` } });
      const issuer = await database.member.create({ data: { id: `member-${suffix}`, householdId: household.id, authenticatedSubjectId: issuerSubject.id, displayName: "Issuer", role: "adult", lifecycle: "active" } });
      const created = await issueHouseholdInvitation(database, { actor: { context: { authenticatedSubjectId: issuerSubject.id, memberId: issuer.id, householdId: household.id }, grants: [] }, intendedRole: "child", intendedDisplayName: "Sam", expiresAt: new Date("2026-08-20T12:00:00.000Z"), now });
      const storedInvitation = await database.invitation.findUniqueOrThrow({ where: { id: created.invitation.invitationId } });
      expect(storedInvitation.tokenHash).toBe(created.invitation.tokenHash);
      expect(storedInvitation.tokenHash).not.toContain(created.token);
      expect(await database.auditEvent.count({ where: { householdId: household.id, action: "identity.invitation.issue" } })).toBe(1);
      expect(await database.outboxEvent.count({ where: { householdId: household.id, eventType: "identity.invitation-issued.v1" } })).toBe(1);

      const accepted = await acceptHouseholdInvitation(database, { token: created.token, subjectId: invitedSubject.id, now });
      const invitation = await database.invitation.findUniqueOrThrow({ where: { id: accepted.invitationId } });
      expect(invitation.acceptedMemberId).toBe(accepted.member.memberId);
      expect(await database.member.count({ where: { householdId: household.id } })).toBe(2);
      expect(await database.auditEvent.count({ where: { householdId: household.id, action: "identity.invitation.accept" } })).toBe(1);
      expect(await database.outboxEvent.count({ where: { householdId: household.id, eventType: "identity.invitation-accepted.v1" } })).toBe(1);
      await expect(acceptHouseholdInvitation(database, { token: created.token, subjectId: invitedSubject.id, now })).rejects.toThrow("Invitation has already been accepted.");
      const expired = await issueHouseholdInvitation(database, { actor: { context: { authenticatedSubjectId: issuerSubject.id, memberId: issuer.id, householdId: household.id }, grants: [] }, intendedRole: "guest", intendedDisplayName: "Expired guest", expiresAt: new Date("2026-08-20T12:00:00.000Z"), now });
      await expect(acceptHouseholdInvitation(database, { token: expired.token, subjectId: `expired-subject-${suffix}`, now: new Date("2026-08-21T12:00:00.000Z") })).rejects.toThrow("Invitation has expired.");
      expect(await database.invitation.findUniqueOrThrow({ where: { id: expired.invitation.invitationId } })).toMatchObject({ acceptedAt: null, acceptedMemberId: null });
      const collision = await issueHouseholdInvitation(database, { actor: { context: { authenticatedSubjectId: issuerSubject.id, memberId: issuer.id, householdId: household.id }, grants: [] }, intendedRole: "child", intendedDisplayName: "Duplicate subject", expiresAt: new Date("2026-08-20T12:00:00.000Z"), now });
      await expect(acceptHouseholdInvitation(database, { token: collision.token, subjectId: invitedSubject.id, now })).rejects.toThrow();
      expect(await database.invitation.findUniqueOrThrow({ where: { id: collision.invitation.invitationId } })).toMatchObject({ acceptedAt: null, acceptedMemberId: null });
      expect(await database.member.count({ where: { householdId: household.id } })).toBe(2);
    } finally { await database.$disconnect(); }
  });

  it("denies removing the final adult and audits a permitted lifecycle change", async () => {
    const { createPostgresAdapter } = await import("./postgres-adapter");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { changeMemberLifecycle, loadActiveHouseholdAccess, MemberLifecycleError } = await import("./identity-repository");
    const { ActiveContextError } = await import("./identity-context");
    const database = new PrismaClient({ adapter: createPostgresAdapter(databaseUrl!) });
    try {
      const suffix = randomUUID();
      const now = new Date("2026-08-18T12:00:00.000Z");
      const household = await database.household.create({ data: { id: `lifecycle-household-${suffix}`, name: "Lifecycle" } });
      const firstSubject = await database.user.create({ data: { id: `lifecycle-first-${suffix}`, name: "First", email: `lifecycle-first-${suffix}@example.test` } });
      const secondSubject = await database.user.create({ data: { id: `lifecycle-second-${suffix}`, name: "Second", email: `lifecycle-second-${suffix}@example.test` } });
      const firstAdult = await database.member.create({ data: { id: `lifecycle-member-first-${suffix}`, householdId: household.id, authenticatedSubjectId: firstSubject.id, displayName: "First", role: "adult", lifecycle: "active" } });
      const secondAdult = await database.member.create({ data: { id: `lifecycle-member-second-${suffix}`, householdId: household.id, authenticatedSubjectId: secondSubject.id, displayName: "Second", role: "adult", lifecycle: "active" } });
      const actor = { context: { authenticatedSubjectId: firstSubject.id, memberId: firstAdult.id, householdId: household.id }, role: "adult" as const, grants: [] };

      await expect(loadActiveHouseholdAccess(database, { authenticatedSubjectId: firstSubject.id, requestedMemberId: firstAdult.id, now })).resolves.toMatchObject({ context: actor.context, role: "adult" });
      await expect(loadActiveHouseholdAccess(database, { authenticatedSubjectId: firstSubject.id, requestedMemberId: secondAdult.id, now })).rejects.toThrow(ActiveContextError);
      await changeMemberLifecycle(database, { actor, targetMemberId: secondAdult.id, lifecycle: "suspended", commandId: `lifecycle-suspend-${suffix}`, now });
      await changeMemberLifecycle(database, { actor, targetMemberId: secondAdult.id, lifecycle: "suspended", commandId: `lifecycle-suspend-${suffix}`, now });
      await expect(changeMemberLifecycle(database, { actor, targetMemberId: firstAdult.id, lifecycle: "removed", commandId: `lifecycle-suspend-${suffix}`, now })).rejects.toThrow(MemberLifecycleError);
      expect(await database.member.findUniqueOrThrow({ where: { id: secondAdult.id } })).toMatchObject({ lifecycle: "suspended" });
      expect(await database.auditEvent.count({ where: { householdId: household.id, action: "identity.member.suspended" } })).toBe(1);
      expect(await database.outboxEvent.count({ where: { householdId: household.id, eventType: "identity.member-suspended.v1" } })).toBe(1);
      expect(await database.memberLifecycleCommand.count({ where: { householdId: household.id, targetMemberId: secondAdult.id } })).toBe(1);
      await expect(changeMemberLifecycle(database, { actor, targetMemberId: firstAdult.id, lifecycle: "removed", commandId: `lifecycle-final-${suffix}`, now })).rejects.toThrow(MemberLifecycleError);
      expect(await database.member.findUniqueOrThrow({ where: { id: firstAdult.id } })).toMatchObject({ lifecycle: "active" });
    } finally { await database.$disconnect(); }
  });

  it("unlinks subjects and expires guests with current-state authorization and audit evidence", async () => {
    const { createPostgresAdapter } = await import("./postgres-adapter");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { changeMemberLifecycle, expireGuestMembership, loadActiveHouseholdAccess, MemberLifecycleError, unlinkMemberSubject } = await import("./identity-repository");
    const database = new PrismaClient({ adapter: createPostgresAdapter(databaseUrl!) });
    try {
      const suffix = randomUUID();
      const now = new Date("2026-08-19T12:00:00.000Z");
      const household = await database.household.create({ data: { id: `unlink-household-${suffix}`, name: "Unlink" } });
      const otherHousehold = await database.household.create({ data: { id: `unlink-other-household-${suffix}`, name: "Other" } });
      const actorSubject = await database.user.create({ data: { id: `unlink-actor-subject-${suffix}`, name: "Actor", email: `unlink-actor-${suffix}@example.test` } });
      const backupSubject = await database.user.create({ data: { id: `unlink-backup-subject-${suffix}`, name: "Backup", email: `unlink-backup-${suffix}@example.test` } });
      const childSubject = await database.user.create({ data: { id: `unlink-child-subject-${suffix}`, name: "Child", email: `unlink-child-${suffix}@example.test` } });
      const otherSubject = await database.user.create({ data: { id: `unlink-other-subject-${suffix}`, name: "Other", email: `unlink-other-${suffix}@example.test` } });
      const actorMember = await database.member.create({ data: { id: `unlink-actor-${suffix}`, householdId: household.id, authenticatedSubjectId: actorSubject.id, displayName: "Actor", role: "adult", lifecycle: "active" } });
      const backupAdult = await database.member.create({ data: { id: `unlink-backup-${suffix}`, householdId: household.id, authenticatedSubjectId: backupSubject.id, displayName: "Backup", role: "adult", lifecycle: "active" } });
      const child = await database.member.create({ data: { id: `unlink-child-${suffix}`, householdId: household.id, authenticatedSubjectId: childSubject.id, displayName: "Child", role: "child", lifecycle: "active" } });
      const expiredGuest = await database.member.create({ data: { id: `unlink-guest-${suffix}`, householdId: household.id, displayName: "Guest", role: "guest", lifecycle: "active", expiresAt: new Date("2026-08-19T11:59:00.000Z") } });
      const otherMember = await database.member.create({ data: { id: `unlink-other-${suffix}`, householdId: otherHousehold.id, authenticatedSubjectId: otherSubject.id, displayName: "Other", role: "child", lifecycle: "active" } });
      const actor = { context: { authenticatedSubjectId: actorSubject.id, memberId: actorMember.id, householdId: household.id }, grants: [] };

      await unlinkMemberSubject(database, { actor, targetMemberId: child.id, now });
      expect(await database.member.findUniqueOrThrow({ where: { id: child.id } })).toMatchObject({ authenticatedSubjectId: null, lifecycle: "suspended" });
      await expect(loadActiveHouseholdAccess(database, { authenticatedSubjectId: childSubject.id, requestedMemberId: child.id, now })).rejects.toThrow();
      await expect(unlinkMemberSubject(database, { actor, targetMemberId: child.id, now })).rejects.toThrow(MemberLifecycleError);
      await expect(unlinkMemberSubject(database, { actor, targetMemberId: otherMember.id, now })).rejects.toThrow(MemberLifecycleError);

      await unlinkMemberSubject(database, { actor, targetMemberId: backupAdult.id, now });
      await expect(unlinkMemberSubject(database, { actor, targetMemberId: actorMember.id, now })).rejects.toThrow(MemberLifecycleError);
      expect(await database.auditEvent.count({ where: { householdId: household.id, action: "identity.member.unlink-subject" } })).toBe(2);
      expect(await database.outboxEvent.count({ where: { householdId: household.id, eventType: "identity.member-subject-unlinked.v1" } })).toBe(2);

      expect(await expireGuestMembership(database, { targetMemberId: expiredGuest.id, now })).toMatchObject({ lifecycle: "suspended" });
      expect(await expireGuestMembership(database, { targetMemberId: expiredGuest.id, now })).toBeNull();
      expect(await database.auditEvent.count({ where: { householdId: household.id, action: "identity.member.expire-guest" } })).toBe(1);
      expect(await database.outboxEvent.count({ where: { householdId: household.id, eventType: "identity.member-guest-expired.v1" } })).toBe(1);

      await database.member.update({ where: { id: actorMember.id }, data: { lifecycle: "suspended" } });
      await expect(changeMemberLifecycle(database, { actor: { ...actor, role: "adult" }, targetMemberId: otherMember.id, lifecycle: "suspended", commandId: `lifecycle-cross-${suffix}`, now })).rejects.toThrow(MemberLifecycleError);
    } finally { await database.$disconnect(); }
  });

  it("persists authorized app enablement and enforces dependencies", async () => {
    const { createPostgresAdapter } = await import("./postgres-adapter");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { MiniAppConfigurationConflictError, MiniAppConfigurationError, setHouseholdMiniAppEnabled } = await import("./identity-repository");
    const database = new PrismaClient({ adapter: createPostgresAdapter(databaseUrl!) });
    try {
      const suffix = randomUUID();
      const now = new Date("2026-08-18T12:00:00.000Z");
      const household = await database.household.create({ data: { id: `apps-household-${suffix}`, name: "Apps" } });
      const subject = await database.user.create({ data: { id: `apps-subject-${suffix}`, name: "Adult", email: `apps-${suffix}@example.test` } });
      const member = await database.member.create({ data: { id: `apps-member-${suffix}`, householdId: household.id, authenticatedSubjectId: subject.id, displayName: "Adult", role: "adult", lifecycle: "active" } });
      const actor = { context: { authenticatedSubjectId: subject.id, memberId: member.id, householdId: household.id }, grants: [] };
      const childSubject = await database.user.create({ data: { id: `apps-child-subject-${suffix}`, name: "Child", email: `apps-child-${suffix}@example.test` } });
      const child = await database.member.create({ data: { id: `apps-child-member-${suffix}`, householdId: household.id, authenticatedSubjectId: childSubject.id, displayName: "Child", role: "child", lifecycle: "active" } });
      const childActor = { context: { authenticatedSubjectId: childSubject.id, memberId: child.id, householdId: household.id }, grants: [] };

      await expect(setHouseholdMiniAppEnabled(database, { actor, appId: "rewards", enabled: true, expectedVersion: 0, commandId: `apps-rewards-blocked-${suffix}`, now })).rejects.toThrow(MiniAppConfigurationError);
      const chores = await setHouseholdMiniAppEnabled(database, { actor, appId: "chores", enabled: true, expectedVersion: 0, commandId: `apps-chores-${suffix}`, now });
      expect((await setHouseholdMiniAppEnabled(database, { actor, appId: "chores", enabled: true, expectedVersion: 0, commandId: `apps-chores-${suffix}`, now })).id).toBe(chores.id);
      await setHouseholdMiniAppEnabled(database, { actor, appId: "rewards", enabled: true, expectedVersion: 0, commandId: `apps-rewards-${suffix}`, now });
      await expect(setHouseholdMiniAppEnabled(database, { actor, appId: "chores", enabled: false, expectedVersion: 1, commandId: `apps-chores-disable-${suffix}`, now })).rejects.toThrow(MiniAppConfigurationError);
      await expect(setHouseholdMiniAppEnabled(database, { actor, appId: "rewards", enabled: false, expectedVersion: 0, commandId: `apps-rewards-stale-${suffix}`, now })).rejects.toThrow(MiniAppConfigurationConflictError);
      await expect(setHouseholdMiniAppEnabled(database, { actor: childActor, appId: "shared-lists", enabled: true, expectedVersion: 0, commandId: `apps-child-${suffix}`, now })).rejects.toThrow(MiniAppConfigurationError);
      expect(await database.householdMiniAppConfiguration.findMany({ where: { householdId: household.id, enabled: true }, orderBy: { appId: "asc" } })).toMatchObject([{ appId: "chores", enabled: true }, { appId: "rewards", enabled: true }]);
      expect(await database.auditEvent.count({ where: { householdId: household.id, action: "mini-app.enable" } })).toBe(2);
      expect(await database.outboxEvent.count({ where: { householdId: household.id, eventType: "mini-app.enabled.v1" } })).toBe(2);
      expect(await database.miniAppConfigurationCommand.count({ where: { householdId: household.id } })).toBe(2);
      await database.member.update({ where: { id: member.id }, data: { lifecycle: "suspended" } });
      await expect(setHouseholdMiniAppEnabled(database, { actor, appId: "chores", enabled: true, expectedVersion: 0, commandId: `apps-chores-${suffix}`, now })).rejects.toThrow(MiniAppConfigurationError);
    } finally { await database.$disconnect(); }
  });

  it("creates replay-safe household-scoped shared lists only when the app is enabled", async () => {
    const { createPostgresAdapter } = await import("./postgres-adapter");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { setHouseholdMiniAppEnabled } = await import("./identity-repository");
    const { addSharedListItem, completeSharedListItem, createSharedList, loadSharedList, loadSharedLists, SharedListCommandError, SharedListConflictError } = await import("./shared-list-repository");
    const database = new PrismaClient({ adapter: createPostgresAdapter(databaseUrl!) });
    try {
      const suffix = randomUUID();
      const now = new Date("2026-08-18T12:00:00.000Z");
      const household = await database.household.create({ data: { id: `lists-household-${suffix}`, name: "Lists" } });
      const subject = await database.user.create({ data: { id: `lists-subject-${suffix}`, name: "Adult", email: `lists-${suffix}@example.test` } });
      const member = await database.member.create({ data: { id: `lists-member-${suffix}`, householdId: household.id, authenticatedSubjectId: subject.id, displayName: "Adult", role: "adult", lifecycle: "active" } });
      const actor = { context: { authenticatedSubjectId: subject.id, memberId: member.id, householdId: household.id }, grants: [] };
      const childSubject = await database.user.create({ data: { id: `lists-child-subject-${suffix}`, name: "Child", email: `lists-child-${suffix}@example.test` } });
      const child = await database.member.create({ data: { id: `lists-child-member-${suffix}`, householdId: household.id, authenticatedSubjectId: childSubject.id, displayName: "Child", role: "child", lifecycle: "active" } });
      const childActor = { context: { authenticatedSubjectId: childSubject.id, memberId: child.id, householdId: household.id }, grants: [] };
      const guestSubject = await database.user.create({ data: { id: `lists-guest-subject-${suffix}`, name: "Guest", email: `lists-guest-${suffix}@example.test` } });
      const guest = await database.member.create({ data: { id: `lists-guest-member-${suffix}`, householdId: household.id, authenticatedSubjectId: guestSubject.id, displayName: "Guest", role: "guest", lifecycle: "active" } });
      const guestActor = { context: { authenticatedSubjectId: guestSubject.id, memberId: guest.id, householdId: household.id }, grants: [] };
      await expect(createSharedList(database, { actor, title: "Errands", commandId: `list-${suffix}`, now })).rejects.toThrow(SharedListCommandError);
      await setHouseholdMiniAppEnabled(database, { actor, appId: "shared-lists", enabled: true, expectedVersion: 0, commandId: `lists-enable-${suffix}`, now });
      const list = await createSharedList(database, { actor, title: "Errands", commandId: `list-${suffix}`, now });
      expect((await createSharedList(database, { actor, title: "Ignored replay", commandId: `list-${suffix}`, now })).id).toBe(list.id);
      const item = await addSharedListItem(database, { actor, listId: list.id, label: "Buy fruit", commandId: `item-${suffix}`, now });
      expect((await addSharedListItem(database, { actor, listId: list.id, label: "Ignored replay", commandId: `item-${suffix}`, now })).id).toBe(item.id);
      expect(await loadSharedLists(database, { actor: childActor, now })).toMatchObject([{ id: list.id, _count: { items: 1 } }]);
      expect(await loadSharedList(database, { actor: childActor, listId: list.id, now })).toMatchObject({ id: list.id, items: [{ id: item.id }] });
      await expect(createSharedList(database, { actor: childActor, title: "Child write", commandId: `child-${suffix}`, now })).rejects.toThrow(SharedListCommandError);
      await expect(loadSharedLists(database, { actor: guestActor, now })).rejects.toThrow(SharedListCommandError);
      await expect(completeSharedListItem(database, { actor: childActor, listId: list.id, itemId: item.id, expectedVersion: 999, commandId: `complete-stale-${suffix}`, now })).rejects.toThrow(SharedListConflictError);
      const completed = await completeSharedListItem(database, { actor: childActor, listId: list.id, itemId: item.id, expectedVersion: item.version, commandId: `complete-${suffix}`, now });
      expect(completed).toMatchObject({ id: item.id, state: "completed", version: item.version + 1, completedByMemberId: child.id });
      expect((await completeSharedListItem(database, { actor: childActor, listId: list.id, itemId: item.id, expectedVersion: item.version, commandId: `complete-${suffix}`, now })).id).toBe(item.id);
      await expect(completeSharedListItem(database, { actor, listId: list.id, itemId: item.id, expectedVersion: item.version, commandId: `complete-${suffix}`, now })).rejects.toThrow(SharedListCommandError);
      await expect(completeSharedListItem(database, { actor: guestActor, listId: list.id, itemId: item.id, expectedVersion: item.version, commandId: `guest-complete-${suffix}`, now })).rejects.toThrow(SharedListCommandError);
      const otherHousehold = await database.household.create({ data: { id: `lists-other-household-${suffix}`, name: "Other lists" } });
      const otherSubject = await database.user.create({ data: { id: `lists-other-subject-${suffix}`, name: "Other adult", email: `lists-other-${suffix}@example.test` } });
      const otherMember = await database.member.create({ data: { id: `lists-other-member-${suffix}`, householdId: otherHousehold.id, authenticatedSubjectId: otherSubject.id, displayName: "Other adult", role: "adult", lifecycle: "active" } });
      const otherActor = { context: { authenticatedSubjectId: otherSubject.id, memberId: otherMember.id, householdId: otherHousehold.id }, grants: [] };
      await setHouseholdMiniAppEnabled(database, { actor: otherActor, appId: "shared-lists", enabled: true, expectedVersion: 0, commandId: `lists-other-enable-${suffix}`, now });
      await expect(addSharedListItem(database, { actor: otherActor, listId: list.id, label: "Cross-household", commandId: `cross-${suffix}`, now })).rejects.toThrow(SharedListCommandError);
      expect(await loadSharedLists(database, { actor: otherActor, now })).toEqual([]);
      await expect(loadSharedList(database, { actor: otherActor, listId: list.id, now })).rejects.toThrow(SharedListCommandError);
      await expect(completeSharedListItem(database, { actor: otherActor, listId: list.id, itemId: item.id, expectedVersion: item.version, commandId: `complete-${suffix}`, now })).rejects.toThrow(SharedListCommandError);
      expect(await database.sharedListItem.count({ where: { listId: list.id } })).toBe(1);
      expect(await database.auditEvent.count({ where: { householdId: household.id, action: { startsWith: "shared-list" } } })).toBe(3);
      expect(await database.outboxEvent.count({ where: { householdId: household.id, eventType: { startsWith: "shared-list" } } })).toBe(3);
      await database.member.update({ where: { id: member.id }, data: { lifecycle: "suspended" } });
      await expect(createSharedList(database, { actor, title: "Suspended replay", commandId: `list-${suffix}`, now })).rejects.toThrow(SharedListCommandError);
      await expect(addSharedListItem(database, { actor, listId: list.id, label: "Suspended replay", commandId: `item-${suffix}`, now })).rejects.toThrow(SharedListCommandError);
      await expect(loadSharedLists(database, { actor, now })).rejects.toThrow(SharedListCommandError);
    } finally { await database.$disconnect(); }
  });

  it("completes only the active child assignee and replays safely", async () => {
    const { createPostgresAdapter } = await import("./postgres-adapter");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { setHouseholdMiniAppEnabled } = await import("./identity-repository");
    const { completePersistedAssignedChore, ChoreCompletionError } = await import("./chore-repository");
    const { searchAuthorizedRecords } = await import("./global-search-repository");
    const { loadTodayDashboard } = await import("./today-dashboard-repository");
    const database = new PrismaClient({ adapter: createPostgresAdapter(databaseUrl!) });
    try {
      const suffix = randomUUID(); const now = new Date("2026-08-18T12:00:00.000Z");
      const household = await database.household.create({ data: { id: `chores-household-${suffix}`, name: "Chores", timeZone: "America/Toronto", locale: "en-CA" } });
      const adultSubject = await database.user.create({ data: { id: `chores-adult-${suffix}`, name: "Adult", email: `chores-adult-${suffix}@example.test` } });
      const childSubject = await database.user.create({ data: { id: `chores-child-${suffix}`, name: "Child", email: `chores-child-${suffix}@example.test` } });
      const adult = await database.member.create({ data: { id: `chores-adult-member-${suffix}`, householdId: household.id, authenticatedSubjectId: adultSubject.id, displayName: "Adult", role: "adult", lifecycle: "active" } });
      const child = await database.member.create({ data: { id: `chores-child-member-${suffix}`, householdId: household.id, authenticatedSubjectId: childSubject.id, displayName: "Child", role: "child", lifecycle: "active" } });
      const adultActor = { context: { authenticatedSubjectId: adultSubject.id, memberId: adult.id, householdId: household.id }, grants: [] };
      const childContext = { authenticatedSubjectId: childSubject.id, memberId: child.id, householdId: household.id };
      await setHouseholdMiniAppEnabled(database, { actor: adultActor, appId: "chores", enabled: true, expectedVersion: 0, commandId: `chores-enable-${suffix}`, now });
      const assignment = await database.choreAssignment.create({ data: { householdId: household.id, assigneeMemberId: child.id, title: "Feed pet", dueDate: "2026-08-18" } });
      expect(await searchAuthorizedRecords(database, { context: childContext, query: "feed" })).toMatchObject([{ type: "Chore", results: [{ id: assignment.id }] }]);
      expect(await searchAuthorizedRecords(database, { context: adultActor.context, query: "feed" })).toEqual([]);
      expect(household).toMatchObject({ timeZone: "America/Toronto", locale: "en-CA" });
      expect(await loadTodayDashboard(database, { context: childContext, date: "2026-08-18", timeZone: household.timeZone })).toMatchObject({ items: [{ id: assignment.id }] });
      expect((await loadTodayDashboard(database, { context: adultActor.context, date: "2026-08-18", timeZone: household.timeZone })).items).toEqual([]);
      await expect(completePersistedAssignedChore(database, { context: adultActor.context, grants: [], assignmentId: assignment.id, commandId: `adult-${suffix}`, now })).rejects.toThrow(ChoreCompletionError);
      const completed = await completePersistedAssignedChore(database, { context: childContext, grants: [], assignmentId: assignment.id, commandId: `child-${suffix}`, now });
      expect((await completePersistedAssignedChore(database, { context: childContext, grants: [], assignmentId: assignment.id, commandId: `child-${suffix}`, now })).id).toBe(completed.id);
      await expect(completePersistedAssignedChore(database, { context: adultActor.context, grants: [], assignmentId: assignment.id, commandId: `child-${suffix}`, now })).rejects.toThrow(ChoreCompletionError);
      expect(completed).toMatchObject({ state: "completed", completedByMemberId: child.id });
      expect(await database.auditEvent.count({ where: { householdId: household.id, action: "chores.complete" } })).toBe(1);
    } finally { await database.$disconnect(); }
  });

  it("schedules one notification only for an eligible same-household recipient", async () => {
    const { createPostgresAdapter } = await import("./postgres-adapter");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { scheduleNotificationEnvelope, NotificationCommandError } = await import("./notification-repository");
    const database = new PrismaClient({ adapter: createPostgresAdapter(databaseUrl!) });
    try {
      const suffix = randomUUID(); const now = new Date("2026-08-19T10:00:00.000Z");
      const household = await database.household.create({ data: { id: `notification-schedule-household-${suffix}`, name: "Schedule notifications" } });
      const otherHousehold = await database.household.create({ data: { id: `notification-schedule-other-${suffix}`, name: "Other household" } });
      const recipient = await database.member.create({ data: { id: `notification-schedule-member-${suffix}`, householdId: household.id, displayName: "Recipient", role: "child", lifecycle: "active" } });
      const otherRecipient = await database.member.create({ data: { id: `notification-schedule-other-member-${suffix}`, householdId: otherHousehold.id, displayName: "Other", role: "child", lifecycle: "active" } });
      const sourceEvent = await database.outboxEvent.create({ data: { id: `notification-source-event-${suffix}`, householdId: household.id, aggregateType: "chore-assignment", aggregateId: `assignment-${suffix}`, eventType: "chore.assigned.v1", schemaVersion: 1, correlationId: `notification-source-correlation-${suffix}`, references: { assigneeMemberId: recipient.id }, occurredAt: now } });
      const command = { householdId: household.id, recipientMemberId: recipient.id, templateId: "chore.assigned", sourceEventId: sourceEvent.id, references: { assignmentId: `assignment-${suffix}` }, deliverAt: new Date("2026-08-20T10:00:00.000Z"), deepLink: `/chores/assignments/assignment-${suffix}`, now };

      const created = await scheduleNotificationEnvelope(database, command);
      expect((await scheduleNotificationEnvelope(database, command)).id).toBe(created.id);
      expect(await database.notificationEnvelope.count({ where: { deduplicationKey: created.deduplicationKey } })).toBe(1);
      expect(await database.auditEvent.count({ where: { householdId: household.id, action: "notification.schedule", targetId: created.id } })).toBe(1);
      expect(await database.outboxEvent.count({ where: { householdId: household.id, eventType: "notification.scheduled.v1", aggregateId: created.id } })).toBe(1);
      await expect(scheduleNotificationEnvelope(database, { ...command, recipientMemberId: otherRecipient.id })).rejects.toThrow(NotificationCommandError);
    } finally { await database.$disconnect(); }
  });

  it("loads and marks read only the active recipient's notification", async () => {
    const { createPostgresAdapter } = await import("./postgres-adapter");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { dismissNotification, loadNotificationInbox, markNotificationRead, releaseDueNotifications, NotificationCommandError } = await import("./notification-repository");
    const database = new PrismaClient({ adapter: createPostgresAdapter(databaseUrl!) });
    try {
      const suffix = randomUUID(); const now = new Date("2026-08-19T10:00:00.000Z");
      const household = await database.household.create({ data: { id: `notifications-household-${suffix}`, name: "Notifications" } });
      const adultSubject = await database.user.create({ data: { id: `notifications-adult-${suffix}`, name: "Adult", email: `notifications-adult-${suffix}@example.test` } });
      const childSubject = await database.user.create({ data: { id: `notifications-child-${suffix}`, name: "Child", email: `notifications-child-${suffix}@example.test` } });
      const guestSubject = await database.user.create({ data: { id: `notifications-active-guest-${suffix}`, name: "Guest", email: `notifications-guest-${suffix}@example.test` } });
      const adult = await database.member.create({ data: { id: `notifications-adult-member-${suffix}`, householdId: household.id, authenticatedSubjectId: adultSubject.id, displayName: "Adult", role: "adult", lifecycle: "active" } });
      const child = await database.member.create({ data: { id: `notifications-child-member-${suffix}`, householdId: household.id, authenticatedSubjectId: childSubject.id, displayName: "Child", role: "child", lifecycle: "active" } });
      const activeGuest = await database.member.create({ data: { id: `notifications-active-guest-member-${suffix}`, householdId: household.id, authenticatedSubjectId: guestSubject.id, displayName: "Guest", role: "guest", lifecycle: "active" } });
      const expiredGuest = await database.member.create({ data: { id: `notifications-guest-member-${suffix}`, householdId: household.id, displayName: "Expired guest", role: "guest", lifecycle: "active", expiresAt: new Date("2026-08-19T09:00:00.000Z") } });
      const adultContext = { authenticatedSubjectId: adultSubject.id, memberId: adult.id, householdId: household.id };
      const childContext = { authenticatedSubjectId: childSubject.id, memberId: child.id, householdId: household.id };
      const childNotification = await database.notificationEnvelope.create({ data: { id: `notification-child-${suffix}`, householdId: household.id, recipientMemberId: child.id, templateId: "chore.due", sourceEventId: `event-child-${suffix}`, references: { assignmentId: `assignment-${suffix}` }, deduplicationKey: `dedupe-child-${suffix}`, deliverAt: now, state: "scheduled", deepLink: `/chores/assignments/assignment-${suffix}` } });
      const dismissibleNotification = await database.notificationEnvelope.create({ data: { id: `notification-dismiss-${suffix}`, householdId: household.id, recipientMemberId: child.id, templateId: "chore.reminder", sourceEventId: `event-dismiss-${suffix}`, references: { assignmentId: `assignment-${suffix}` }, deduplicationKey: `dedupe-dismiss-${suffix}`, deliverAt: now, state: "available" } });
      const expiredGuestNotification = await database.notificationEnvelope.create({ data: { id: `notification-guest-${suffix}`, householdId: household.id, recipientMemberId: expiredGuest.id, templateId: "household.summary", sourceEventId: `event-guest-${suffix}`, references: {}, deduplicationKey: `dedupe-guest-${suffix}`, deliverAt: now, state: "scheduled" } });
      await database.notificationEnvelope.create({ data: { id: `notification-adult-${suffix}`, householdId: household.id, recipientMemberId: adult.id, templateId: "household.summary", sourceEventId: `event-adult-${suffix}`, references: {}, deduplicationKey: `dedupe-adult-${suffix}`, deliverAt: now, state: "available" } });

      const childInboxInput = { context: childContext, grants: [], now };
      await expect(loadNotificationInbox(database, { context: { authenticatedSubjectId: guestSubject.id, memberId: activeGuest.id, householdId: household.id }, grants: [], now })).rejects.toThrow(NotificationCommandError);
      expect(await loadNotificationInbox(database, childInboxInput)).toMatchObject([{ id: dismissibleNotification.id, state: "available" }]);
      expect(await releaseDueNotifications(database, { householdId: household.id, now })).toEqual({ available: 1, cancelled: 1 });
      expect(await database.notificationEnvelope.findUniqueOrThrow({ where: { id: expiredGuestNotification.id }, select: { state: true } })).toEqual({ state: "cancelled" });
      expect((await loadNotificationInbox(database, childInboxInput)).some((notification) => notification.id === childNotification.id)).toBe(true);
      await expect(markNotificationRead(database, { context: adultContext, grants: [], notificationId: childNotification.id, now })).rejects.toThrow(NotificationCommandError);
      await markNotificationRead(database, { context: childContext, grants: [], notificationId: childNotification.id, now });
      await markNotificationRead(database, { context: childContext, grants: [], notificationId: childNotification.id, now });
      await dismissNotification(database, { context: childContext, grants: [], notificationId: dismissibleNotification.id, now });
      await dismissNotification(database, { context: childContext, grants: [], notificationId: dismissibleNotification.id, now });
      expect(await database.auditEvent.count({ where: { householdId: household.id, action: "notification.read", targetId: childNotification.id } })).toBe(1);
      expect(await database.auditEvent.count({ where: { householdId: household.id, action: "notification.dismiss", targetId: dismissibleNotification.id } })).toBe(1);
      expect(await loadNotificationInbox(database, childInboxInput)).toMatchObject([{ id: childNotification.id, state: "read" }]);
      expect((await loadNotificationInbox(database, childInboxInput)).some((notification) => notification.id === dismissibleNotification.id)).toBe(false);
      await dismissNotification(database, { context: childContext, grants: [], notificationId: childNotification.id, now });
      expect(await database.auditEvent.count({ where: { householdId: household.id, action: "notification.dismiss", targetId: childNotification.id } })).toBe(1);
      expect(await loadNotificationInbox(database, childInboxInput)).toEqual([]);
    } finally { await database.$disconnect(); }
  });

  it("persists only the active member's authorized notification preferences", async () => {
    const { createPostgresAdapter } = await import("./postgres-adapter");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { loadNotificationPreference, saveNotificationPreference, NotificationPreferenceCommandError } = await import("./notification-preference-repository");
    const database = new PrismaClient({ adapter: createPostgresAdapter(databaseUrl!) });
    try {
      const suffix = randomUUID(); const now = new Date("2026-08-19T12:00:00.000Z");
      const household = await database.household.create({ data: { id: `notification-preference-household-${suffix}`, name: "Preference household" } });
      const otherHousehold = await database.household.create({ data: { id: `notification-preference-other-${suffix}`, name: "Other household" } });
      const childSubject = await database.user.create({ data: { id: `notification-preference-child-${suffix}`, name: "Child", email: `notification-preference-child-${suffix}@example.test` } });
      const guestSubject = await database.user.create({ data: { id: `notification-preference-guest-${suffix}`, name: "Guest", email: `notification-preference-guest-${suffix}@example.test` } });
      const child = await database.member.create({ data: { id: `notification-preference-child-member-${suffix}`, householdId: household.id, authenticatedSubjectId: childSubject.id, displayName: "Child", role: "child", lifecycle: "active" } });
      const guest = await database.member.create({ data: { id: `notification-preference-guest-member-${suffix}`, householdId: otherHousehold.id, authenticatedSubjectId: guestSubject.id, displayName: "Guest", role: "guest", lifecycle: "active" } });
      const childInput = { context: { authenticatedSubjectId: childSubject.id, householdId: household.id, memberId: child.id }, grants: [], now };
      const guestInput = { context: { authenticatedSubjectId: guestSubject.id, householdId: otherHousehold.id, memberId: guest.id }, grants: [], now };

      expect(await loadNotificationPreference(database, childInput)).toBeNull();
      expect(await saveNotificationPreference(database, { ...childInput, remindersEnabled: true, quietHours: { startMinute: 1320, endMinute: 420 }, timeZone: "America/Toronto" })).toMatchObject({ householdId: household.id, memberId: child.id, quietHours: { startMinute: 1320, endMinute: 420 } });
      expect(await loadNotificationPreference(database, childInput)).toMatchObject({ remindersEnabled: true, timeZone: "America/Toronto" });
      await expect(saveNotificationPreference(database, { ...guestInput, remindersEnabled: true, quietHours: null, timeZone: "Etc/UTC" })).rejects.toThrow(NotificationPreferenceCommandError);
      await expect(database.notificationPreference.create({ data: { householdId: household.id, memberId: guest.id, remindersEnabled: true, timeZone: "Etc/UTC" } })).rejects.toThrow();
      expect(await database.auditEvent.count({ where: { householdId: household.id, action: "notification.preference.update", targetId: child.id } })).toBe(1);
      expect(await database.outboxEvent.count({ where: { householdId: household.id, eventType: "notification.preference.updated.v1", aggregateId: child.id } })).toBe(1);
    } finally { await database.$disconnect(); }
  });

  it("provisions an invited Better Auth account and compensates a lost acceptance race", async () => {
    const { createPostgresAdapter } = await import("./postgres-adapter");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { acceptHouseholdInvitation, issueHouseholdInvitation } = await import("./identity-repository");
    const { acceptInvitationForNewAccount, InvitationAccountEntryError } = await import("./invitation-account-entry");
    const { createInvitationAccountProvisioner } = await import("./invitation-auth-core");
    const database = new PrismaClient({ adapter: createPostgresAdapter(databaseUrl!) });
    try {
      const suffix = randomUUID();
      const now = new Date("2026-08-19T18:00:00.000Z");
      const environment = {
        databaseUrl: databaseUrl!,
        betterAuthUrl: "http://127.0.0.1:3000",
        trustedOrigin: "http://127.0.0.1:3000",
        betterAuthSecret: "integration-only-secret-that-is-at-least-thirty-two-characters",
      };
      const requestHeaders = new Headers({ origin: environment.trustedOrigin, "user-agent": "life-chat-integration" });
      const household = await database.household.create({ data: { id: `account-entry-household-${suffix}`, name: "Account entry" } });
      const issuerSubject = await database.user.create({ data: { id: `account-entry-issuer-${suffix}`, name: "Issuer", email: `account-entry-issuer-${suffix}@example.test` } });
      const issuer = await database.member.create({ data: { id: `account-entry-member-${suffix}`, householdId: household.id, authenticatedSubjectId: issuerSubject.id, displayName: "Issuer", role: "adult", lifecycle: "active" } });
      const actor = { context: { authenticatedSubjectId: issuerSubject.id, memberId: issuer.id, householdId: household.id }, grants: [] };
      const first = await issueHouseholdInvitation(database, { actor, intendedRole: "child", intendedDisplayName: "Invited child", expiresAt: new Date("2026-08-20T18:00:00.000Z"), now });
      const email = `account-entry-new-${suffix}@example.test`;
      const password = "integration-password-123";
      const accepted = await acceptInvitationForNewAccount(database, {
        token: first.token,
        email,
        password,
        now,
        provisioner: createInvitationAccountProvisioner({ database, environment, requestHeaders }),
      });
      expect(accepted.setCookies.some((cookie) => cookie.includes("better-auth.session_token"))).toBe(true);
      const createdUser = await database.user.findUniqueOrThrow({ where: { email } });
      expect(await database.member.findUniqueOrThrow({ where: { householdId_authenticatedSubjectId: { householdId: household.id, authenticatedSubjectId: createdUser.id } } })).toMatchObject({ role: "child", lifecycle: "active" });
      const credential = await database.account.findFirstOrThrow({ where: { userId: createdUser.id, providerId: "credential" } });
      expect(credential.password).not.toBe(password);
      expect(await database.session.count({ where: { userId: createdUser.id } })).toBe(1);

      const duplicateEmailInvite = await issueHouseholdInvitation(database, { actor, intendedRole: "child", intendedDisplayName: "Existing email", expiresAt: new Date("2026-08-20T18:00:00.000Z"), now });
      await expect(acceptInvitationForNewAccount(database, {
        token: duplicateEmailInvite.token,
        email,
        password,
        now,
        provisioner: createInvitationAccountProvisioner({ database, environment, requestHeaders }),
      })).rejects.toThrow(InvitationAccountEntryError);
      expect(await database.invitation.findUniqueOrThrow({ where: { id: duplicateEmailInvite.invitation.invitationId } })).toMatchObject({ acceptedAt: null, acceptedMemberId: null });

      const second = await issueHouseholdInvitation(database, { actor, intendedRole: "guest", intendedDisplayName: "Race guest", expiresAt: new Date("2026-08-20T18:00:00.000Z"), now });
      const competingSubject = await database.user.create({ data: { id: `account-entry-racer-${suffix}`, name: "Racer", email: `account-entry-racer-${suffix}@example.test` } });
      const realProvisioner = createInvitationAccountProvisioner({ database, environment, requestHeaders });
      let rolledBackSubjectId = "";
      await expect(acceptInvitationForNewAccount(database, {
        token: second.token,
        email: `account-entry-rollback-${suffix}@example.test`,
        password,
        now,
        provisioner: {
          async create(input) {
            const provisioned = await realProvisioner.create(input);
            rolledBackSubjectId = provisioned.subjectId;
            await acceptHouseholdInvitation(database, { token: second.token, subjectId: competingSubject.id, now });
            return provisioned;
          },
        },
      })).rejects.toThrow(InvitationAccountEntryError);
      expect(await database.user.findUnique({ where: { id: rolledBackSubjectId } })).toBeNull();
      expect(await database.account.count({ where: { userId: rolledBackSubjectId } })).toBe(0);
      expect(await database.session.count({ where: { userId: rolledBackSubjectId } })).toBe(0);
    } finally { await database.$disconnect(); }
  });
});
