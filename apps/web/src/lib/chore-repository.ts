import type { PrismaClient } from "../../generated/prisma/client";
import { createAuditEvent, createDomainEvent, newCorrelationId } from "./audit-event";
import type { ActiveHouseholdContext } from "./identity-context";
import { loadHouseholdMiniAppConfiguration } from "./identity-repository";
import { activationEligibility } from "./mini-app-registry";
import { authorize, type CapabilityGrant } from "./permission-engine";
import { parseDateOnly, type DateOnly } from "./date-time";

export class ChoreCompletionError extends Error {}

type ChoreActor = { context: ActiveHouseholdContext; grants: readonly CapabilityGrant[] };

function boundedCommandId(value: string): string {
  if (value.trim().length === 0 || value.length > 200) throw new ChoreCompletionError("A bounded command ID is required.");
  return value;
}

function boundedTitle(value: string): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 200 || /[\r\n\u0000]/.test(normalized)) throw new ChoreCompletionError("A chore title must be 1–200 characters without control characters.");
  return normalized;
}

async function loadActiveChoreMember(database: PrismaClient, actor: ChoreActor, now: Date) {
  const member = await database.member.findFirst({ where: {
    id: actor.context.memberId, householdId: actor.context.householdId,
    authenticatedSubjectId: actor.context.authenticatedSubjectId, lifecycle: "active",
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  } });
  if (member === null) throw new ChoreCompletionError("The active member is no longer eligible.");
  const configuration = await loadHouseholdMiniAppConfiguration(database, member.householdId);
  if (!activationEligibility("chores", configuration).eligible) throw new ChoreCompletionError("Chores is not enabled for this household.");
  return member;
}

function canManageChores(input: { actor: ChoreActor; role: "adult" | "child" | "guest"; householdId: string; now: Date }): boolean {
  return authorize({ context: input.actor.context, role: input.role, grants: input.actor.grants, request: { householdId: input.householdId, permission: "chores.manage", appId: "chores" }, now: input.now }).allowed;
}

export async function loadPersistedChoreAssignments(database: PrismaClient, input: { actor: ChoreActor; now: Date }) {
  return database.$transaction(async (transaction) => {
    const member = await loadActiveChoreMember(transaction as PrismaClient, input.actor, input.now);
    const canManage = canManageChores({ actor: input.actor, role: member.role, householdId: member.householdId, now: input.now });
    const canCompleteAssigned = authorize({ context: input.actor.context, role: member.role, grants: input.actor.grants, request: { householdId: member.householdId, permission: "chores.complete-assigned", appId: "chores" }, now: input.now }).allowed;
    if (!canManage && !canCompleteAssigned) throw new ChoreCompletionError("Chores are not available to this household member.");
    const assignments = await transaction.choreAssignment.findMany({
      where: { householdId: member.householdId, ...(canManage ? {} : { assigneeMemberId: member.id }) },
      orderBy: [{ state: "asc" }, { dueDate: "asc" }, { title: "asc" }, { id: "asc" }],
    });
    const assigneeIds = [...new Set(assignments.map((assignment) => assignment.assigneeMemberId))];
    const assignees = canManage && assigneeIds.length > 0 ? await transaction.member.findMany({ where: { householdId: member.householdId, id: { in: assigneeIds } }, select: { id: true, displayName: true } }) : [];
    const names = new Map(assignees.map((assignee) => [assignee.id, assignee.displayName]));
    return { assignments, canManage, assigneeNames: names, activeMembers: canManage ? await transaction.member.findMany({ where: { householdId: member.householdId, lifecycle: "active", role: { not: "guest" }, OR: [{ expiresAt: null }, { expiresAt: { gt: input.now } }] }, select: { id: true, displayName: true, role: true }, orderBy: [{ displayName: "asc" }, { id: "asc" }] }) : [] };
  }, { isolationLevel: "Serializable" });
}

export async function createPersistedChoreAssignment(database: PrismaClient, input: { actor: ChoreActor; assigneeMemberId: string; title: string; dueDate: DateOnly | null; commandId: string; now: Date }) {
  const title = boundedTitle(input.title);
  const commandId = boundedCommandId(input.commandId);
  if (input.dueDate !== null) parseDateOnly(input.dueDate);
  return database.$transaction(async (transaction) => {
    const member = await loadActiveChoreMember(transaction as PrismaClient, input.actor, input.now);
    if (!canManageChores({ actor: input.actor, role: member.role, householdId: member.householdId, now: input.now })) throw new ChoreCompletionError("The active member cannot manage chores.");
    const replay = await transaction.choreAssignment.findUnique({ where: { creationCommandId: commandId } });
    if (replay !== null) {
      if (replay.householdId !== member.householdId || replay.assigneeMemberId !== input.assigneeMemberId || replay.title !== title || replay.dueDate !== input.dueDate) throw new ChoreCompletionError("The creation command does not match this household assignment.");
      return replay;
    }
    const assignee = await transaction.member.findFirst({ where: { id: input.assigneeMemberId, householdId: member.householdId, lifecycle: "active", role: { not: "guest" }, OR: [{ expiresAt: null }, { expiresAt: { gt: input.now } }] } });
    if (assignee === null) throw new ChoreCompletionError("Choose an active household member for this chore.");
    const assignment = await transaction.choreAssignment.create({ data: { householdId: member.householdId, assigneeMemberId: assignee.id, title, dueDate: input.dueDate, creationCommandId: commandId } });
    const correlationId = newCorrelationId();
    const audit = createAuditEvent({ householdId: member.householdId, actor: { type: "member", id: member.id }, action: "chores.assign", target: { type: "chore-assignment", id: assignment.id }, outcome: "succeeded", correlationId, causationId: null, occurredAt: input.now.toISOString(), metadata: { assigneeMemberId: assignee.id, dueDate: input.dueDate } });
    const event = createDomainEvent({ householdId: member.householdId, aggregate: { type: "chore-assignment", id: assignment.id }, type: "chores.assigned.v1", correlationId, causationId: audit.id, occurredAt: input.now.toISOString(), references: { assigneeMemberId: assignee.id } });
    await transaction.auditEvent.create({ data: { id: audit.id, householdId: audit.householdId, actorType: audit.actor.type, actorId: audit.actor.id, action: audit.action, targetType: audit.target.type, targetId: audit.target.id, outcome: audit.outcome, correlationId: audit.correlationId, causationId: audit.causationId, metadata: audit.metadata, occurredAt: new Date(audit.occurredAt) } });
    await transaction.outboxEvent.create({ data: { id: event.id, householdId: event.householdId, aggregateType: event.aggregate.type, aggregateId: event.aggregate.id, eventType: event.type, schemaVersion: event.schemaVersion, correlationId: event.correlationId, causationId: event.causationId, references: event.references, occurredAt: new Date(event.occurredAt) } });
    return assignment;
  }, { isolationLevel: "Serializable" });
}

export async function completePersistedAssignedChore(database: PrismaClient, input: { context: ActiveHouseholdContext; grants: readonly CapabilityGrant[]; assignmentId: string; commandId: string; now: Date }) {
  boundedCommandId(input.commandId);
  return database.$transaction(async (transaction) => {
    const actor = { context: input.context, grants: input.grants };
    const member = await loadActiveChoreMember(transaction as PrismaClient, actor, input.now);
    const allowed = authorize({ context: input.context, role: member.role, grants: input.grants, request: { householdId: member.householdId, permission: "chores.complete-assigned" }, now: input.now });
    if (!allowed.allowed) throw new ChoreCompletionError("Chore completion is not authorized.");
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
