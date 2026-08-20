import type { PrismaClient } from "../../generated/prisma/client";
import { createAuditEvent, createDomainEvent, newCorrelationId } from "./audit-event";
import { dateOnlyAtInstant, parseDateOnly, type DateOnly } from "./date-time";
import type { ActiveHouseholdContext } from "./identity-context";
import { loadHouseholdMiniAppConfiguration } from "./identity-repository";
import { activationEligibility } from "./mini-app-registry";
import { authorize, type CapabilityGrant } from "./permission-engine";
import { createHabitProgress, type HabitProgress } from "./habits";

export class HabitCommandError extends Error {}
export class HabitConflictError extends HabitCommandError {}

type Actor = { context: ActiveHouseholdContext; grants: readonly CapabilityGrant[] };

function boundedText(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 200 || /[\r\n\u0000]/.test(normalized)) throw new HabitCommandError(`${field} must be 1–200 characters without control characters.`);
  return normalized;
}

function boundedCommandId(value: string): string {
  if (value.trim().length === 0 || value.length > 200) throw new HabitCommandError("commandId must be a bounded opaque identifier.");
  return value;
}

async function authorizeHabits(database: PrismaClient, actor: Actor, permission: "habits.read" | "habits.record" | "habits.manage", now: Date) {
  const member = await database.member.findFirst({ where: {
    id: actor.context.memberId, householdId: actor.context.householdId,
    authenticatedSubjectId: actor.context.authenticatedSubjectId, lifecycle: "active",
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  }, include: { household: { select: { timeZone: true } } } });
  if (member === null || member.role === "guest") throw new HabitCommandError("Habits is not available to this household member.");
  const decision = authorize({ context: actor.context, role: member.role, grants: actor.grants, request: { householdId: member.householdId, permission, appId: "habits" }, now });
  if (!decision.allowed) throw new HabitCommandError("Habits is not available to this household member.");
  const configuration = await loadHouseholdMiniAppConfiguration(database, member.householdId);
  if (!activationEligibility("habits", configuration).eligible) throw new HabitCommandError("Habits is not enabled for this household.");
  return { member, configuration };
}

export async function loadPersistedHabitProgress(database: PrismaClient, input: { actor: Actor; now: Date }): Promise<{ today: DateOnly; progress: readonly HabitProgress[]; canManage: boolean }> {
  return database.$transaction(async (transaction) => {
    const { member, configuration } = await authorizeHabits(transaction as PrismaClient, input.actor, "habits.read", input.now);
    const today = dateOnlyAtInstant({ instant: input.now.toISOString(), timeZone: member.household.timeZone });
    const routines = await transaction.habitRoutine.findMany({ where: { householdId: member.householdId, ownerMemberId: member.id, archivedAt: null }, include: { completions: { select: { completionDate: true }, orderBy: { completionDate: "desc" } } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    const progress = createHabitProgress({ context: input.actor.context, configuration, today, routines: routines.map((routine) => ({ id: routine.id, householdId: routine.householdId, ownerMemberId: routine.ownerMemberId, label: routine.label, completionDates: routine.completions.map((completion) => completion.completionDate), authorized: true })) });
    const canManage = authorize({ context: input.actor.context, role: member.role, grants: input.actor.grants, request: { householdId: member.householdId, permission: "habits.manage", appId: "habits" }, now: input.now }).allowed;
    return { today, progress, canManage };
  }, { isolationLevel: "Serializable" });
}

export async function createHabitRoutine(database: PrismaClient, input: { actor: Actor; label: string; commandId: string; now: Date }) {
  const label = boundedText(input.label, "label");
  const commandId = boundedCommandId(input.commandId);
  return database.$transaction(async (transaction) => {
    const { member } = await authorizeHabits(transaction as PrismaClient, input.actor, "habits.manage", input.now);
    const existing = await transaction.habitRoutine.findUnique({ where: { creationCommandId: commandId } });
    if (existing !== null) {
      if (existing.householdId !== member.householdId || existing.ownerMemberId !== member.id) throw new HabitCommandError("commandId cannot cross household or member boundaries.");
      return existing;
    }
    const routine = await transaction.habitRoutine.create({ data: { householdId: member.householdId, ownerMemberId: member.id, label, creationCommandId: commandId } });
    const correlationId = newCorrelationId();
    const auditEvent = createAuditEvent({ householdId: member.householdId, actor: { type: "member", id: member.id }, action: "habit.create", target: { type: "habit-routine", id: routine.id }, outcome: "succeeded", correlationId, causationId: null, occurredAt: input.now.toISOString(), metadata: {} });
    const domainEvent = createDomainEvent({ householdId: member.householdId, aggregate: { type: "habit-routine", id: routine.id }, type: "habit.created.v1", correlationId, causationId: auditEvent.id, occurredAt: input.now.toISOString(), references: {} });
    await transaction.auditEvent.create({ data: { id: auditEvent.id, householdId: auditEvent.householdId, actorType: auditEvent.actor.type, actorId: auditEvent.actor.id, action: auditEvent.action, targetType: auditEvent.target.type, targetId: auditEvent.target.id, outcome: auditEvent.outcome, correlationId: auditEvent.correlationId, causationId: auditEvent.causationId, metadata: auditEvent.metadata, occurredAt: new Date(auditEvent.occurredAt) } });
    await transaction.outboxEvent.create({ data: { id: domainEvent.id, householdId: domainEvent.householdId, aggregateType: domainEvent.aggregate.type, aggregateId: domainEvent.aggregate.id, eventType: domainEvent.type, schemaVersion: domainEvent.schemaVersion, correlationId: domainEvent.correlationId, causationId: domainEvent.causationId, references: domainEvent.references, occurredAt: new Date(domainEvent.occurredAt) } });
    return routine;
  }, { isolationLevel: "Serializable" });
}

export async function completeHabitRoutine(database: PrismaClient, input: { actor: Actor; routineId: string; commandId: string; now: Date }) {
  const commandId = boundedCommandId(input.commandId);
  try {
    return await database.$transaction(async (transaction) => {
      const { member } = await authorizeHabits(transaction as PrismaClient, input.actor, "habits.record", input.now);
      const today = dateOnlyAtInstant({ instant: input.now.toISOString(), timeZone: member.household.timeZone });
      const existing = await transaction.habitCompletion.findUnique({ where: { completionCommandId: commandId } });
      if (existing !== null) {
        if (existing.householdId !== member.householdId || existing.routineId !== input.routineId || existing.completedByMemberId !== member.id || existing.completionDate !== today) throw new HabitCommandError("commandId cannot cross routine, member, household, or date boundaries.");
        return existing;
      }
      const routine = await transaction.habitRoutine.findFirst({ where: { id: input.routineId, householdId: member.householdId, ownerMemberId: member.id, archivedAt: null } });
      if (routine === null) throw new HabitCommandError("The habit routine is not available to complete.");
      const alreadyCompleted = await transaction.habitCompletion.findUnique({ where: { routineId_completionDate: { routineId: routine.id, completionDate: today } } });
      if (alreadyCompleted !== null) throw new HabitConflictError("This habit is already complete for today.");
      const completion = await transaction.habitCompletion.create({ data: { householdId: member.householdId, routineId: routine.id, completionDate: today, completionCommandId: commandId, completedByMemberId: member.id } });
      const correlationId = newCorrelationId();
      const auditEvent = createAuditEvent({ householdId: member.householdId, actor: { type: "member", id: member.id }, action: "habit.complete", target: { type: "habit-routine", id: routine.id }, outcome: "succeeded", correlationId, causationId: null, occurredAt: input.now.toISOString(), metadata: { completionDate: today } });
      const domainEvent = createDomainEvent({ householdId: member.householdId, aggregate: { type: "habit-routine", id: routine.id }, type: "habit.completed.v1", correlationId, causationId: auditEvent.id, occurredAt: input.now.toISOString(), references: { completionId: completion.id, completionDate: today } });
      await transaction.auditEvent.create({ data: { id: auditEvent.id, householdId: auditEvent.householdId, actorType: auditEvent.actor.type, actorId: auditEvent.actor.id, action: auditEvent.action, targetType: auditEvent.target.type, targetId: auditEvent.target.id, outcome: auditEvent.outcome, correlationId: auditEvent.correlationId, causationId: auditEvent.causationId, metadata: auditEvent.metadata, occurredAt: new Date(auditEvent.occurredAt) } });
      await transaction.outboxEvent.create({ data: { id: domainEvent.id, householdId: domainEvent.householdId, aggregateType: domainEvent.aggregate.type, aggregateId: domainEvent.aggregate.id, eventType: domainEvent.type, schemaVersion: domainEvent.schemaVersion, correlationId: domainEvent.correlationId, causationId: domainEvent.causationId, references: domainEvent.references, occurredAt: new Date(domainEvent.occurredAt) } });
      return completion;
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") throw new HabitConflictError("This habit is already complete for today.");
    throw error;
  }
}
