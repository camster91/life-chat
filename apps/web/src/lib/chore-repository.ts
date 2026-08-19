import type { PrismaClient } from "../../generated/prisma/client";
import { createAuditEvent, createDomainEvent, newCorrelationId } from "./audit-event";
import type { ActiveHouseholdContext } from "./identity-context";
import { loadHouseholdMiniAppConfiguration } from "./identity-repository";
import { activationEligibility } from "./mini-app-registry";
import { authorize, type CapabilityGrant } from "./permission-engine";

export class ChoreCompletionError extends Error {}

export async function completePersistedAssignedChore(database: PrismaClient, input: { context: ActiveHouseholdContext; grants: readonly CapabilityGrant[]; assignmentId: string; commandId: string; now: Date }) {
  if (input.commandId.trim().length === 0 || input.commandId.length > 200) throw new ChoreCompletionError("A bounded command ID is required.");
  return database.$transaction(async (transaction) => {
    const member = await transaction.member.findFirst({ where: { id: input.context.memberId, householdId: input.context.householdId, authenticatedSubjectId: input.context.authenticatedSubjectId, lifecycle: "active", OR: [{ expiresAt: null }, { expiresAt: { gt: input.now } }] } });
    if (member === null) throw new ChoreCompletionError("The active member is no longer eligible.");
    const allowed = authorize({ context: input.context, role: member.role, grants: input.grants, request: { householdId: member.householdId, permission: "chores.complete-assigned" }, now: input.now });
    if (!allowed.allowed) throw new ChoreCompletionError("Chore completion is not authorized.");
    const configuration = await loadHouseholdMiniAppConfiguration(transaction as PrismaClient, member.householdId);
    if (!activationEligibility("chores", configuration).eligible) throw new ChoreCompletionError("Chores is not enabled for this household.");
    const replay = await transaction.choreAssignment.findUnique({ where: { completionCommandId: input.commandId } });
    if (replay !== null) {
      const isAuthorizedReplay = replay.id === input.assignmentId
        && replay.householdId === member.householdId
        && replay.assigneeMemberId === member.id
        && replay.completedByMemberId === member.id
        && replay.state === "completed";
      if (!isAuthorizedReplay) throw new ChoreCompletionError("The completion command does not match this assignment and assignee.");
      return replay;
    }
    const assignment = await transaction.choreAssignment.findFirst({ where: { id: input.assignmentId, householdId: member.householdId, assigneeMemberId: member.id, state: "assigned" } });
    if (assignment === null) throw new ChoreCompletionError("The assigned chore is not available to complete.");
    const completed = await transaction.choreAssignment.update({ where: { id: assignment.id }, data: { state: "completed", completedAt: input.now, completedByMemberId: member.id, completionCommandId: input.commandId, version: { increment: 1 } } });
    const correlationId = newCorrelationId();
    const audit = createAuditEvent({ householdId: member.householdId, actor: { type: "member", id: member.id }, action: "chores.complete", target: { type: "chore-assignment", id: completed.id }, outcome: "succeeded", correlationId, causationId: null, occurredAt: input.now.toISOString(), metadata: { source: "normal-ui" } });
    const event = createDomainEvent({ householdId: member.householdId, aggregate: { type: "chore-assignment", id: completed.id }, type: "chores.completed.v1", correlationId, causationId: audit.id, occurredAt: input.now.toISOString(), references: { assigneeMemberId: member.id } });
    await transaction.auditEvent.create({ data: { id: audit.id, householdId: audit.householdId, actorType: audit.actor.type, actorId: audit.actor.id, action: audit.action, targetType: audit.target.type, targetId: audit.target.id, outcome: audit.outcome, correlationId: audit.correlationId, causationId: audit.causationId, metadata: audit.metadata, occurredAt: new Date(audit.occurredAt) } });
    await transaction.outboxEvent.create({ data: { id: event.id, householdId: event.householdId, aggregateType: event.aggregate.type, aggregateId: event.aggregate.id, eventType: event.type, schemaVersion: event.schemaVersion, correlationId: event.correlationId, causationId: event.causationId, references: event.references, occurredAt: new Date(event.occurredAt) } });
    return completed;
  }, { isolationLevel: "Serializable" });
}
