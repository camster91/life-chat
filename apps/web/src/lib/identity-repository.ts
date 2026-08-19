import type { PrismaClient } from "../../generated/prisma/client";
import { planFirstOwnerBootstrap } from "./bootstrap-contract";

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
