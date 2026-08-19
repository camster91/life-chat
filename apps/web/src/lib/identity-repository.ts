import type { PrismaClient } from "../../generated/prisma/client";
import { createAuditEvent, createDomainEvent, newCorrelationId } from "./audit-event";
import { planFirstOwnerBootstrap } from "./bootstrap-contract";
import { acceptInvitation, invitationTokenHash } from "./invitation-contract";

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
  });
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
  });
}
