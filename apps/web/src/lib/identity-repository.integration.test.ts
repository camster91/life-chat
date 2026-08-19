import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

const databaseUrl = process.env.LIFE_CHAT_INTEGRATION_DATABASE_URL;

describe.skipIf(databaseUrl === undefined)("identity repository integration", () => {
  it("accepts an invitation once and writes the member, audit, and outbox records together", async () => {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { acceptHouseholdInvitation, issueHouseholdInvitation } = await import("./identity-repository");
    const database = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
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
      expect(await database.member.count({ where: { householdId: household.id } })).toBe(2);
    } finally { await database.$disconnect(); }
  });

  it("denies removing the final adult and audits a permitted lifecycle change", async () => {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { changeMemberLifecycle, loadActiveHouseholdAccess, MemberLifecycleError } = await import("./identity-repository");
    const { ActiveContextError } = await import("./identity-context");
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

      await expect(loadActiveHouseholdAccess(database, { authenticatedSubjectId: firstSubject.id, requestedMemberId: firstAdult.id, now })).resolves.toMatchObject({ context: actor.context, role: "adult" });
      await expect(loadActiveHouseholdAccess(database, { authenticatedSubjectId: firstSubject.id, requestedMemberId: secondAdult.id, now })).rejects.toThrow(ActiveContextError);
      await changeMemberLifecycle(database, { actor, targetMemberId: secondAdult.id, lifecycle: "suspended", now });
      expect(await database.member.findUniqueOrThrow({ where: { id: secondAdult.id } })).toMatchObject({ lifecycle: "suspended" });
      expect(await database.auditEvent.count({ where: { householdId: household.id, action: "identity.member.suspended" } })).toBe(1);
      expect(await database.outboxEvent.count({ where: { householdId: household.id, eventType: "identity.member-suspended.v1" } })).toBe(1);
      await expect(changeMemberLifecycle(database, { actor, targetMemberId: firstAdult.id, lifecycle: "removed", now })).rejects.toThrow(MemberLifecycleError);
      expect(await database.member.findUniqueOrThrow({ where: { id: firstAdult.id } })).toMatchObject({ lifecycle: "active" });
    } finally { await database.$disconnect(); }
  });

  it("persists authorized app enablement and enforces dependencies", async () => {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { MiniAppConfigurationError, setHouseholdMiniAppEnabled } = await import("./identity-repository");
    const database = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
    try {
      const suffix = randomUUID();
      const now = new Date("2026-08-18T12:00:00.000Z");
      const household = await database.household.create({ data: { id: `apps-household-${suffix}`, name: "Apps" } });
      const subject = await database.user.create({ data: { id: `apps-subject-${suffix}`, name: "Adult", email: `apps-${suffix}@example.test` } });
      const member = await database.member.create({ data: { id: `apps-member-${suffix}`, householdId: household.id, authenticatedSubjectId: subject.id, displayName: "Adult", role: "adult", lifecycle: "active" } });
      const actor = { context: { authenticatedSubjectId: subject.id, memberId: member.id, householdId: household.id }, grants: [] };

      await expect(setHouseholdMiniAppEnabled(database, { actor, appId: "rewards", enabled: true, now })).rejects.toThrow(MiniAppConfigurationError);
      await setHouseholdMiniAppEnabled(database, { actor, appId: "chores", enabled: true, now });
      await setHouseholdMiniAppEnabled(database, { actor, appId: "rewards", enabled: true, now });
      await expect(setHouseholdMiniAppEnabled(database, { actor, appId: "chores", enabled: false, now })).rejects.toThrow(MiniAppConfigurationError);
      expect(await database.householdMiniAppConfiguration.findMany({ where: { householdId: household.id, enabled: true }, orderBy: { appId: "asc" } })).toMatchObject([{ appId: "chores", enabled: true }, { appId: "rewards", enabled: true }]);
      expect(await database.auditEvent.count({ where: { householdId: household.id, action: "mini-app.enable" } })).toBe(2);
      expect(await database.outboxEvent.count({ where: { householdId: household.id, eventType: "mini-app.enabled.v1" } })).toBe(2);
    } finally { await database.$disconnect(); }
  });

  it("creates replay-safe household-scoped shared lists only when the app is enabled", async () => {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { setHouseholdMiniAppEnabled } = await import("./identity-repository");
    const { addSharedListItem, createSharedList, SharedListCommandError } = await import("./shared-list-repository");
    const database = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
    try {
      const suffix = randomUUID();
      const now = new Date("2026-08-18T12:00:00.000Z");
      const household = await database.household.create({ data: { id: `lists-household-${suffix}`, name: "Lists" } });
      const subject = await database.user.create({ data: { id: `lists-subject-${suffix}`, name: "Adult", email: `lists-${suffix}@example.test` } });
      const member = await database.member.create({ data: { id: `lists-member-${suffix}`, householdId: household.id, authenticatedSubjectId: subject.id, displayName: "Adult", role: "adult", lifecycle: "active" } });
      const actor = { context: { authenticatedSubjectId: subject.id, memberId: member.id, householdId: household.id }, grants: [] };
      await expect(createSharedList(database, { actor, title: "Errands", commandId: `list-${suffix}`, now })).rejects.toThrow(SharedListCommandError);
      await setHouseholdMiniAppEnabled(database, { actor, appId: "shared-lists", enabled: true, now });
      const list = await createSharedList(database, { actor, title: "Errands", commandId: `list-${suffix}`, now });
      expect((await createSharedList(database, { actor, title: "Ignored replay", commandId: `list-${suffix}`, now })).id).toBe(list.id);
      const item = await addSharedListItem(database, { actor, listId: list.id, label: "Buy fruit", commandId: `item-${suffix}`, now });
      expect((await addSharedListItem(database, { actor, listId: list.id, label: "Ignored replay", commandId: `item-${suffix}`, now })).id).toBe(item.id);
      const otherHousehold = await database.household.create({ data: { id: `lists-other-household-${suffix}`, name: "Other lists" } });
      const otherSubject = await database.user.create({ data: { id: `lists-other-subject-${suffix}`, name: "Other adult", email: `lists-other-${suffix}@example.test` } });
      const otherMember = await database.member.create({ data: { id: `lists-other-member-${suffix}`, householdId: otherHousehold.id, authenticatedSubjectId: otherSubject.id, displayName: "Other adult", role: "adult", lifecycle: "active" } });
      const otherActor = { context: { authenticatedSubjectId: otherSubject.id, memberId: otherMember.id, householdId: otherHousehold.id }, grants: [] };
      await setHouseholdMiniAppEnabled(database, { actor: otherActor, appId: "shared-lists", enabled: true, now });
      await expect(addSharedListItem(database, { actor: otherActor, listId: list.id, label: "Cross-household", commandId: `cross-${suffix}`, now })).rejects.toThrow(SharedListCommandError);
      expect(await database.sharedListItem.count({ where: { listId: list.id } })).toBe(1);
      expect(await database.auditEvent.count({ where: { householdId: household.id, action: { startsWith: "shared-list" } } })).toBe(2);
      expect(await database.outboxEvent.count({ where: { householdId: household.id, eventType: { startsWith: "shared-list" } } })).toBe(2);
    } finally { await database.$disconnect(); }
  });

  it("completes only the active child assignee and replays safely", async () => {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { setHouseholdMiniAppEnabled } = await import("./identity-repository");
    const { completePersistedAssignedChore, ChoreCompletionError } = await import("./chore-repository");
    const { searchAuthorizedRecords } = await import("./global-search-repository");
    const { loadTodayDashboard } = await import("./today-dashboard-repository");
    const database = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
    try {
      const suffix = randomUUID(); const now = new Date("2026-08-18T12:00:00.000Z");
      const household = await database.household.create({ data: { id: `chores-household-${suffix}`, name: "Chores" } });
      const adultSubject = await database.user.create({ data: { id: `chores-adult-${suffix}`, name: "Adult", email: `chores-adult-${suffix}@example.test` } });
      const childSubject = await database.user.create({ data: { id: `chores-child-${suffix}`, name: "Child", email: `chores-child-${suffix}@example.test` } });
      const adult = await database.member.create({ data: { id: `chores-adult-member-${suffix}`, householdId: household.id, authenticatedSubjectId: adultSubject.id, displayName: "Adult", role: "adult", lifecycle: "active" } });
      const child = await database.member.create({ data: { id: `chores-child-member-${suffix}`, householdId: household.id, authenticatedSubjectId: childSubject.id, displayName: "Child", role: "child", lifecycle: "active" } });
      const adultActor = { context: { authenticatedSubjectId: adultSubject.id, memberId: adult.id, householdId: household.id }, grants: [] };
      const childContext = { authenticatedSubjectId: childSubject.id, memberId: child.id, householdId: household.id };
      await setHouseholdMiniAppEnabled(database, { actor: adultActor, appId: "chores", enabled: true, now });
      const assignment = await database.choreAssignment.create({ data: { householdId: household.id, assigneeMemberId: child.id, title: "Feed pet", dueDate: "2026-08-18" } });
      expect(await searchAuthorizedRecords(database, { context: childContext, query: "feed" })).toMatchObject([{ type: "Chore", results: [{ id: assignment.id }] }]);
      expect(await searchAuthorizedRecords(database, { context: adultActor.context, query: "feed" })).toEqual([]);
      expect(await loadTodayDashboard(database, { context: childContext, date: "2026-08-18", timeZone: "America/Toronto" })).toMatchObject({ items: [{ id: assignment.id }] });
      expect((await loadTodayDashboard(database, { context: adultActor.context, date: "2026-08-18", timeZone: "America/Toronto" })).items).toEqual([]);
      await expect(completePersistedAssignedChore(database, { context: adultActor.context, grants: [], assignmentId: assignment.id, commandId: `adult-${suffix}`, now })).rejects.toThrow(ChoreCompletionError);
      const completed = await completePersistedAssignedChore(database, { context: childContext, grants: [], assignmentId: assignment.id, commandId: `child-${suffix}`, now });
      expect((await completePersistedAssignedChore(database, { context: childContext, grants: [], assignmentId: assignment.id, commandId: `child-${suffix}`, now })).id).toBe(completed.id);
      expect(completed).toMatchObject({ state: "completed", completedByMemberId: child.id });
      expect(await database.auditEvent.count({ where: { householdId: household.id, action: "chores.complete" } })).toBe(1);
    } finally { await database.$disconnect(); }
  });

  it("schedules one notification only for an eligible same-household recipient", async () => {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { scheduleNotificationEnvelope, NotificationCommandError } = await import("./notification-repository");
    const database = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
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
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { PrismaClient } = await import("../../generated/prisma/client");
    const { dismissNotification, loadNotificationInbox, markNotificationRead, releaseDueNotifications, NotificationCommandError } = await import("./notification-repository");
    const database = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
    try {
      const suffix = randomUUID(); const now = new Date("2026-08-19T10:00:00.000Z");
      const household = await database.household.create({ data: { id: `notifications-household-${suffix}`, name: "Notifications" } });
      const adultSubject = await database.user.create({ data: { id: `notifications-adult-${suffix}`, name: "Adult", email: `notifications-adult-${suffix}@example.test` } });
      const childSubject = await database.user.create({ data: { id: `notifications-child-${suffix}`, name: "Child", email: `notifications-child-${suffix}@example.test` } });
      const adult = await database.member.create({ data: { id: `notifications-adult-member-${suffix}`, householdId: household.id, authenticatedSubjectId: adultSubject.id, displayName: "Adult", role: "adult", lifecycle: "active" } });
      const child = await database.member.create({ data: { id: `notifications-child-member-${suffix}`, householdId: household.id, authenticatedSubjectId: childSubject.id, displayName: "Child", role: "child", lifecycle: "active" } });
      const expiredGuest = await database.member.create({ data: { id: `notifications-guest-member-${suffix}`, householdId: household.id, displayName: "Expired guest", role: "guest", lifecycle: "active", expiresAt: new Date("2026-08-19T09:00:00.000Z") } });
      const adultContext = { authenticatedSubjectId: adultSubject.id, memberId: adult.id, householdId: household.id };
      const childContext = { authenticatedSubjectId: childSubject.id, memberId: child.id, householdId: household.id };
      const childNotification = await database.notificationEnvelope.create({ data: { id: `notification-child-${suffix}`, householdId: household.id, recipientMemberId: child.id, templateId: "chore.due", sourceEventId: `event-child-${suffix}`, references: { assignmentId: `assignment-${suffix}` }, deduplicationKey: `dedupe-child-${suffix}`, deliverAt: now, state: "scheduled", deepLink: `/chores/assignments/assignment-${suffix}` } });
      const dismissibleNotification = await database.notificationEnvelope.create({ data: { id: `notification-dismiss-${suffix}`, householdId: household.id, recipientMemberId: child.id, templateId: "chore.reminder", sourceEventId: `event-dismiss-${suffix}`, references: { assignmentId: `assignment-${suffix}` }, deduplicationKey: `dedupe-dismiss-${suffix}`, deliverAt: now, state: "available" } });
      const expiredGuestNotification = await database.notificationEnvelope.create({ data: { id: `notification-guest-${suffix}`, householdId: household.id, recipientMemberId: expiredGuest.id, templateId: "household.summary", sourceEventId: `event-guest-${suffix}`, references: {}, deduplicationKey: `dedupe-guest-${suffix}`, deliverAt: now, state: "scheduled" } });
      await database.notificationEnvelope.create({ data: { id: `notification-adult-${suffix}`, householdId: household.id, recipientMemberId: adult.id, templateId: "household.summary", sourceEventId: `event-adult-${suffix}`, references: {}, deduplicationKey: `dedupe-adult-${suffix}`, deliverAt: now, state: "available" } });

      expect(await loadNotificationInbox(database, childContext)).toMatchObject([{ id: dismissibleNotification.id, state: "available" }]);
      expect(await releaseDueNotifications(database, { householdId: household.id, now })).toEqual({ available: 1, cancelled: 1 });
      expect(await database.notificationEnvelope.findUniqueOrThrow({ where: { id: expiredGuestNotification.id }, select: { state: true } })).toEqual({ state: "cancelled" });
      expect((await loadNotificationInbox(database, childContext)).some((notification) => notification.id === childNotification.id)).toBe(true);
      await expect(markNotificationRead(database, { context: adultContext, grants: [], notificationId: childNotification.id, now })).rejects.toThrow(NotificationCommandError);
      await markNotificationRead(database, { context: childContext, grants: [], notificationId: childNotification.id, now });
      await markNotificationRead(database, { context: childContext, grants: [], notificationId: childNotification.id, now });
      await dismissNotification(database, { context: childContext, grants: [], notificationId: dismissibleNotification.id, now });
      await dismissNotification(database, { context: childContext, grants: [], notificationId: dismissibleNotification.id, now });
      expect(await database.auditEvent.count({ where: { householdId: household.id, action: "notification.read", targetId: childNotification.id } })).toBe(1);
      expect(await database.auditEvent.count({ where: { householdId: household.id, action: "notification.dismiss", targetId: dismissibleNotification.id } })).toBe(1);
      expect(await loadNotificationInbox(database, childContext)).toMatchObject([{ id: childNotification.id, state: "read" }]);
      expect((await loadNotificationInbox(database, childContext)).some((notification) => notification.id === dismissibleNotification.id)).toBe(false);
    } finally { await database.$disconnect(); }
  });
});
