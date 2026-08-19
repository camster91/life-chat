import type { PrismaClient } from "../../generated/prisma/client";
import { createAuditEvent, createDomainEvent, newCorrelationId } from "./audit-event";
import { planFirstOwnerBootstrap } from "./bootstrap-contract";
import { resolveActiveHouseholdContext, type ActiveHouseholdContext } from "./identity-context";
import { acceptInvitation, createInvitation, invitationTokenHash } from "./invitation-contract";
import { activationEligibility, defaultMiniAppConfiguration, miniAppRegistry, type HouseholdMiniAppConfiguration, type MiniAppId } from "./mini-app-registry";
import { authorize, type BaselineRole, type CapabilityGrant } from "./permission-engine";

export class MemberLifecycleError extends Error {}
export class MiniAppConfigurationError extends Error {}

/**
 * Loads an active household only from membership records linked to the
 * authenticated subject. A route must obtain `authenticatedSubjectId` from a
 * verified server session; it must never accept it from the browser.
 */
export async function loadActiveHouseholdAccess(database: PrismaClient, input: {
  authenticatedSubjectId: string;
  requestedMemberId?: string;
  now: Date;
}): Promise<{ context: ActiveHouseholdContext; role: BaselineRole }> {
  const members = await database.member.findMany({
    where: { authenticatedSubjectId: input.authenticatedSubjectId },
    select: { id: true, householdId: true, authenticatedSubjectId: true, lifecycle: true, expiresAt: true, role: true },
  });
  const context = resolveActiveHouseholdContext({
    authenticatedSubjectId: input.authenticatedSubjectId,
    requestedMemberId: input.requestedMemberId,
    now: input.now,
    members: members.map((member) => ({
      memberId: member.id, householdId: member.householdId, authenticatedSubjectId: member.authenticatedSubjectId,
      lifecycle: member.lifecycle, expiresAt: member.expiresAt,
    })),
  });
  const member = members.find((candidate) => candidate.id === context.memberId);
  if (member === undefined) throw new Error("The resolved active member was not loaded.");
  return { context, role: member.role };
}

/** Durable implementation of the setup-only bootstrap plan. */
export async function bootstrapFirstOwner(database: PrismaClient, input: {
  localOperatorConfirmed: boolean;
  subjectId: string;
  householdName: string;
  displayName: string;
  now: Date;
}) {
  return database.$transaction(async (transaction) => {
    const existingHouseholdCount = await transaction.household.count();
    const plan = planFirstOwnerBootstrap({ ...input, existingHouseholdCount });
    await transaction.household.create({ data: { id: plan.household.householdId, name: plan.household.name } });
    await transaction.member.create({ data: {
      id: plan.owner.memberId, householdId: plan.household.householdId, authenticatedSubjectId: plan.owner.subjectId,
      displayName: plan.owner.displayName, role: "adult", lifecycle: "active",
    } });
    await transaction.auditEvent.create({ data: {
      id: plan.auditEvent.id, householdId: plan.auditEvent.householdId, actorType: plan.auditEvent.actor.type,
      actorId: plan.auditEvent.actor.id, action: plan.auditEvent.action, targetType: plan.auditEvent.target.type,
      targetId: plan.auditEvent.target.id, outcome: plan.auditEvent.outcome, correlationId: plan.auditEvent.correlationId,
      causationId: null, metadata: plan.auditEvent.metadata, occurredAt: new Date(plan.auditEvent.occurredAt),
    } });
    await transaction.outboxEvent.create({ data: {
      id: crypto.randomUUID(), householdId: plan.household.householdId, aggregateType: "household", aggregateId: plan.household.householdId,
      eventType: "household.bootstrap-first-owner.v1", schemaVersion: 1, correlationId: plan.auditEvent.correlationId,
      causationId: plan.auditEvent.id, references: { memberId: plan.owner.memberId }, occurredAt: input.now,
    } });
    return plan;
  }, { isolationLevel: "Serializable" });
}

export async function acceptHouseholdInvitation(database: PrismaClient, input: { token: string; subjectId: string; now: Date }) {
  return database.$transaction(async (transaction) => {
    const invitation = await transaction.invitation.findUnique({ where: { tokenHash: invitationTokenHash(input.token) } });
    if (invitation === null) throw new Error("Invitation is invalid.");
    const accepted = acceptInvitation({
      invitation: {
        invitationId: invitation.id, householdId: invitation.householdId, issuerMemberId: invitation.issuerMemberId,
        tokenHash: invitation.tokenHash, intendedRole: invitation.intendedRole, intendedDisplayName: invitation.intendedDisplayName,
        expiresAt: invitation.expiresAt, acceptedAt: invitation.acceptedAt, acceptedSubjectId: invitation.acceptedSubjectId,
        acceptedMemberId: invitation.acceptedMemberId,
      },
      token: input.token, subjectId: input.subjectId, now: input.now,
    });
    const correlationId = newCorrelationId();
    const auditEvent = createAuditEvent({
      householdId: accepted.householdId, actor: { type: "subject", id: accepted.subjectId }, action: "identity.invitation.accept",
      target: { type: "invitation", id: accepted.invitationId }, outcome: "succeeded", correlationId, causationId: null,
      occurredAt: input.now.toISOString(), metadata: { role: accepted.member.role },
    });
    const domainEvent = createDomainEvent({
      householdId: accepted.householdId, aggregate: { type: "member", id: accepted.member.memberId }, type: "identity.invitation-accepted.v1",
      correlationId, causationId: auditEvent.id, occurredAt: input.now.toISOString(), references: { invitationId: accepted.invitationId },
    });
    await transaction.member.create({ data: {
      id: accepted.member.memberId, householdId: accepted.householdId, authenticatedSubjectId: accepted.subjectId,
      displayName: accepted.member.displayName, role: accepted.member.role, lifecycle: "active",
    } });
    const consumed = await transaction.invitation.updateMany({
      where: { id: invitation.id, acceptedAt: null, expiresAt: { gt: input.now } },
      data: { acceptedAt: input.now, acceptedSubjectId: input.subjectId, acceptedMemberId: accepted.member.memberId },
    });
    if (consumed.count !== 1) throw new Error("Invitation has already been accepted.");
    await transaction.auditEvent.create({ data: {
      id: auditEvent.id, householdId: auditEvent.householdId, actorType: auditEvent.actor.type, actorId: auditEvent.actor.id,
      action: auditEvent.action, targetType: auditEvent.target.type, targetId: auditEvent.target.id, outcome: auditEvent.outcome,
      correlationId: auditEvent.correlationId, causationId: auditEvent.causationId, metadata: auditEvent.metadata,
      occurredAt: new Date(auditEvent.occurredAt),
    } });
    await transaction.outboxEvent.create({ data: {
      id: domainEvent.id, householdId: domainEvent.householdId, aggregateType: domainEvent.aggregate.type,
      aggregateId: domainEvent.aggregate.id, eventType: domainEvent.type, schemaVersion: domainEvent.schemaVersion,
      correlationId: domainEvent.correlationId, causationId: domainEvent.causationId, references: domainEvent.references,
      occurredAt: new Date(domainEvent.occurredAt),
    } });
    return accepted;
  }, { isolationLevel: "Serializable" });
}

/**
 * Issues a stored invitation after reloading the issuer from the database.
 * The returned token is the only raw-token exposure; callers must present it
 * directly to the intended recipient and must never log or persist it.
 */
export async function issueHouseholdInvitation(database: PrismaClient, input: {
  actor: { context: ActiveHouseholdContext; grants: readonly CapabilityGrant[] };
  intendedRole: BaselineRole;
  intendedDisplayName: string;
  expiresAt: Date;
  now: Date;
}) {
  return database.$transaction(async (transaction) => {
    const issuer = await transaction.member.findFirst({ where: {
      id: input.actor.context.memberId, householdId: input.actor.context.householdId,
      authenticatedSubjectId: input.actor.context.authenticatedSubjectId, lifecycle: "active",
      OR: [{ expiresAt: null }, { expiresAt: { gt: input.now } }],
    } });
    if (issuer === null) throw new MemberLifecycleError("The active member is no longer eligible to issue invitations.");
    const authorization = authorize({
      context: input.actor.context, role: issuer.role, grants: input.actor.grants,
      request: { householdId: issuer.householdId, permission: "member.invite" }, now: input.now,
    });
    if (!authorization.allowed) throw new MemberLifecycleError("The active member cannot issue invitations.");

    const created = createInvitation({
      householdId: issuer.householdId, issuerMemberId: issuer.id, intendedRole: input.intendedRole,
      intendedDisplayName: input.intendedDisplayName, expiresAt: input.expiresAt, now: input.now,
    });
    const correlationId = newCorrelationId();
    const auditEvent = createAuditEvent({
      householdId: issuer.householdId, actor: { type: "member", id: issuer.id }, action: "identity.invitation.issue",
      target: { type: "invitation", id: created.invitation.invitationId }, outcome: "succeeded", correlationId,
      causationId: null, occurredAt: input.now.toISOString(), metadata: { role: created.invitation.intendedRole },
    });
    const domainEvent = createDomainEvent({
      householdId: issuer.householdId, aggregate: { type: "invitation", id: created.invitation.invitationId },
      type: "identity.invitation-issued.v1", correlationId, causationId: auditEvent.id, occurredAt: input.now.toISOString(),
      references: { issuerMemberId: issuer.id },
    });
    await transaction.invitation.create({ data: {
      id: created.invitation.invitationId, householdId: created.invitation.householdId, issuerMemberId: created.invitation.issuerMemberId,
      tokenHash: created.invitation.tokenHash, intendedRole: created.invitation.intendedRole,
      intendedDisplayName: created.invitation.intendedDisplayName, expiresAt: created.invitation.expiresAt,
    } });
    await transaction.auditEvent.create({ data: {
      id: auditEvent.id, householdId: auditEvent.householdId, actorType: auditEvent.actor.type, actorId: auditEvent.actor.id,
      action: auditEvent.action, targetType: auditEvent.target.type, targetId: auditEvent.target.id, outcome: auditEvent.outcome,
      correlationId: auditEvent.correlationId, causationId: auditEvent.causationId, metadata: auditEvent.metadata,
      occurredAt: new Date(auditEvent.occurredAt),
    } });
    await transaction.outboxEvent.create({ data: {
      id: domainEvent.id, householdId: domainEvent.householdId, aggregateType: domainEvent.aggregate.type,
      aggregateId: domainEvent.aggregate.id, eventType: domainEvent.type, schemaVersion: domainEvent.schemaVersion,
      correlationId: domainEvent.correlationId, causationId: domainEvent.causationId, references: domainEvent.references,
      occurredAt: new Date(domainEvent.occurredAt),
    } });
    return created;
  }, { isolationLevel: "Serializable" });
}

export async function loadHouseholdMiniAppConfiguration(database: PrismaClient, householdId: string): Promise<HouseholdMiniAppConfiguration> {
  const stored = await database.householdMiniAppConfiguration.findMany({ where: { householdId } });
  const configuration = defaultMiniAppConfiguration();
  for (const item of stored) {
    const definition = miniAppRegistry.find((candidate) => candidate.id === item.appId);
    if (definition !== undefined && item.settingsSchemaVersion === definition.settingsSchemaVersion) {
      configuration[definition.id] = { enabled: item.enabled, settingsSchemaVersion: definition.settingsSchemaVersion };
    }
  }
  return configuration;
}

/** Enables or disables one known mini-app without implicitly changing dependencies. */
export async function setHouseholdMiniAppEnabled(database: PrismaClient, input: {
  actor: { context: ActiveHouseholdContext; grants: readonly CapabilityGrant[] };
  appId: MiniAppId;
  enabled: boolean;
  now: Date;
}) {
  return database.$transaction(async (transaction) => {
    const actor = await transaction.member.findFirst({ where: {
      id: input.actor.context.memberId, householdId: input.actor.context.householdId,
      authenticatedSubjectId: input.actor.context.authenticatedSubjectId, lifecycle: "active",
      OR: [{ expiresAt: null }, { expiresAt: { gt: input.now } }],
    } });
    if (actor === null) throw new MiniAppConfigurationError("The active member is no longer eligible to configure apps.");
    const authorization = authorize({ context: input.actor.context, role: actor.role, grants: input.actor.grants, request: { householdId: actor.householdId, permission: "mini-app.configure" }, now: input.now });
    if (!authorization.allowed) throw new MiniAppConfigurationError("The active member cannot configure apps.");
    const definition = miniAppRegistry.find((candidate) => candidate.id === input.appId);
    if (definition === undefined) throw new MiniAppConfigurationError("The requested mini-app is unknown.");

    const configuration = await loadHouseholdMiniAppConfiguration(transaction as PrismaClient, actor.householdId);
    configuration[input.appId] = { enabled: input.enabled, settingsSchemaVersion: definition.settingsSchemaVersion };
    if (input.enabled) {
      const eligibility = activationEligibility(input.appId, configuration);
      if (!eligibility.eligible) throw new MiniAppConfigurationError(`The mini-app cannot be enabled: ${eligibility.reason}.`);
    } else {
      const enabledDependents = miniAppRegistry.filter((candidate) => candidate.dependsOn.includes(input.appId) && configuration[candidate.id].enabled);
      if (enabledDependents.length > 0) throw new MiniAppConfigurationError("Disable dependent mini-apps before disabling this mini-app.");
    }

    const correlationId = newCorrelationId();
    const auditEvent = createAuditEvent({
      householdId: actor.householdId, actor: { type: "member", id: actor.id }, action: input.enabled ? "mini-app.enable" : "mini-app.disable",
      target: { type: "mini-app", id: input.appId }, outcome: "succeeded", correlationId, causationId: null,
      occurredAt: input.now.toISOString(), metadata: { settingsSchemaVersion: definition.settingsSchemaVersion },
    });
    const domainEvent = createDomainEvent({
      householdId: actor.householdId, aggregate: { type: "mini-app-configuration", id: `${actor.householdId}:${input.appId}` },
      type: input.enabled ? "mini-app.enabled.v1" : "mini-app.disabled.v1", correlationId, causationId: auditEvent.id,
      occurredAt: input.now.toISOString(), references: { appId: input.appId },
    });
    const saved = await transaction.householdMiniAppConfiguration.upsert({
      where: { householdId_appId: { householdId: actor.householdId, appId: input.appId } },
      create: { householdId: actor.householdId, appId: input.appId, enabled: input.enabled, settingsSchemaVersion: definition.settingsSchemaVersion, settings: {} },
      update: { enabled: input.enabled, settingsSchemaVersion: definition.settingsSchemaVersion },
    });
    await transaction.auditEvent.create({ data: { id: auditEvent.id, householdId: auditEvent.householdId, actorType: auditEvent.actor.type, actorId: auditEvent.actor.id, action: auditEvent.action, targetType: auditEvent.target.type, targetId: auditEvent.target.id, outcome: auditEvent.outcome, correlationId: auditEvent.correlationId, causationId: auditEvent.causationId, metadata: auditEvent.metadata, occurredAt: new Date(auditEvent.occurredAt) } });
    await transaction.outboxEvent.create({ data: { id: domainEvent.id, householdId: domainEvent.householdId, aggregateType: domainEvent.aggregate.type, aggregateId: domainEvent.aggregate.id, eventType: domainEvent.type, schemaVersion: domainEvent.schemaVersion, correlationId: domainEvent.correlationId, causationId: domainEvent.causationId, references: domainEvent.references, occurredAt: new Date(domainEvent.occurredAt) } });
    return saved;
  }, { isolationLevel: "Serializable" });
}

/**
 * Changes a member's access lifecycle. `actor.context` must come from a
 * verified session and server-derived active household context, never from a
 * browser-supplied household ID.
 */
export async function changeMemberLifecycle(database: PrismaClient, input: {
  actor: { context: ActiveHouseholdContext; role: BaselineRole; grants: readonly CapabilityGrant[] };
  targetMemberId: string;
  lifecycle: "suspended" | "removed";
  now: Date;
}) {
  const authorization = authorize({
    context: input.actor.context,
    role: input.actor.role,
    grants: input.actor.grants,
    request: { householdId: input.actor.context.householdId, permission: "member.manage" },
    now: input.now,
  });
  if (!authorization.allowed) throw new MemberLifecycleError("The active member cannot manage household members.");

  // Serializable isolation makes simultaneous final-adult changes fail rather
  // than permitting two stale counts to remove the household's last adult.
  return database.$transaction(async (transaction) => {
    const target = await transaction.member.findFirst({
      where: { id: input.targetMemberId, householdId: input.actor.context.householdId },
    });
    if (target === null) throw new MemberLifecycleError("The requested member is not in the active household.");
    if (target.lifecycle !== "active") throw new MemberLifecycleError("Only active members can change lifecycle.");

    if (target.role === "adult") {
      const activeAdultCount = await transaction.member.count({
        where: { householdId: target.householdId, role: "adult", lifecycle: "active" },
      });
      if (activeAdultCount <= 1) throw new MemberLifecycleError("A household must retain at least one active adult.");
    }

    const correlationId = newCorrelationId();
    const auditEvent = createAuditEvent({
      householdId: target.householdId, actor: { type: "member", id: input.actor.context.memberId },
      action: `identity.member.${input.lifecycle}`, target: { type: "member", id: target.id }, outcome: "succeeded",
      correlationId, causationId: null, occurredAt: input.now.toISOString(), metadata: { priorRole: target.role },
    });
    const domainEvent = createDomainEvent({
      householdId: target.householdId, aggregate: { type: "member", id: target.id }, type: `identity.member-${input.lifecycle}.v1`,
      correlationId, causationId: auditEvent.id, occurredAt: input.now.toISOString(), references: { actorMemberId: input.actor.context.memberId },
    });
    const member = await transaction.member.update({ where: { id: target.id }, data: { lifecycle: input.lifecycle } });
    await transaction.auditEvent.create({ data: {
      id: auditEvent.id, householdId: auditEvent.householdId, actorType: auditEvent.actor.type, actorId: auditEvent.actor.id,
      action: auditEvent.action, targetType: auditEvent.target.type, targetId: auditEvent.target.id, outcome: auditEvent.outcome,
      correlationId: auditEvent.correlationId, causationId: auditEvent.causationId, metadata: auditEvent.metadata,
      occurredAt: new Date(auditEvent.occurredAt),
    } });
    await transaction.outboxEvent.create({ data: {
      id: domainEvent.id, householdId: domainEvent.householdId, aggregateType: domainEvent.aggregate.type,
      aggregateId: domainEvent.aggregate.id, eventType: domainEvent.type, schemaVersion: domainEvent.schemaVersion,
      correlationId: domainEvent.correlationId, causationId: domainEvent.causationId, references: domainEvent.references,
      occurredAt: new Date(domainEvent.occurredAt),
    } });
    return member;
  }, { isolationLevel: "Serializable" });
}
