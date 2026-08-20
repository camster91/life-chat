import type { PrismaClient } from "../../generated/prisma/client";
import { createAuditEvent, createDomainEvent, newCorrelationId } from "./audit-event";
import type { ActiveHouseholdContext } from "./identity-context";
import { loadHouseholdMiniAppConfiguration } from "./identity-repository";
import { activationEligibility } from "./mini-app-registry";
import { authorize, type CapabilityGrant } from "./permission-engine";

export class RewardCommandError extends Error {}
export class RewardConflictError extends RewardCommandError {}
type Actor = { context: ActiveHouseholdContext; grants: readonly CapabilityGrant[] };

function boundedText(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 200 || /[\r\n\u0000]/.test(normalized)) throw new RewardCommandError(`${field} must be 1–200 characters without control characters.`);
  return normalized;
}
function boundedCommandId(value: string): string {
  if (value.trim().length === 0 || value.length > 200) throw new RewardCommandError("commandId must be a bounded opaque identifier.");
  return value;
}
async function authorizeRewards(database: PrismaClient, actor: Actor, permission: "rewards.read" | "rewards.request" | "rewards.manage" | "rewards.approve", now: Date) {
  const member = await database.member.findFirst({ where: { id: actor.context.memberId, householdId: actor.context.householdId, authenticatedSubjectId: actor.context.authenticatedSubjectId, lifecycle: "active", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } });
  if (member === null || member.role === "guest") throw new RewardCommandError("Rewards is not available to this household member.");
  if (!authorize({ context: actor.context, role: member.role, grants: actor.grants, request: { householdId: member.householdId, permission, appId: "rewards" }, now }).allowed) throw new RewardCommandError("Rewards is not available to this household member.");
  const configuration = await loadHouseholdMiniAppConfiguration(database, member.householdId);
  if (!activationEligibility("rewards", configuration).eligible) throw new RewardCommandError("Rewards is not enabled for this household.");
  return member;
}
async function writeEvidence(transaction: PrismaClient, input: { householdId: string; memberId: string; action: string; targetType: string; targetId: string; eventType: string; aggregateType: string; aggregateId: string; now: Date; references?: Record<string, string> }) {
  const correlationId = newCorrelationId();
  const auditEvent = createAuditEvent({ householdId: input.householdId, actor: { type: "member", id: input.memberId }, action: input.action, target: { type: input.targetType, id: input.targetId }, outcome: "succeeded", correlationId, causationId: null, occurredAt: input.now.toISOString(), metadata: {} });
  const domainEvent = createDomainEvent({ householdId: input.householdId, aggregate: { type: input.aggregateType, id: input.aggregateId }, type: input.eventType, correlationId, causationId: auditEvent.id, occurredAt: input.now.toISOString(), references: input.references ?? {} });
  await transaction.auditEvent.create({ data: { id: auditEvent.id, householdId: auditEvent.householdId, actorType: auditEvent.actor.type, actorId: auditEvent.actor.id, action: auditEvent.action, targetType: auditEvent.target.type, targetId: auditEvent.target.id, outcome: auditEvent.outcome, correlationId: auditEvent.correlationId, causationId: auditEvent.causationId, metadata: auditEvent.metadata, occurredAt: new Date(auditEvent.occurredAt) } });
  await transaction.outboxEvent.create({ data: { id: domainEvent.id, householdId: domainEvent.householdId, aggregateType: domainEvent.aggregate.type, aggregateId: domainEvent.aggregate.id, eventType: domainEvent.type, schemaVersion: domainEvent.schemaVersion, correlationId: domainEvent.correlationId, causationId: domainEvent.causationId, references: domainEvent.references, occurredAt: new Date(domainEvent.occurredAt) } });
}

export async function loadRewardWorkspace(database: PrismaClient, input: { actor: Actor; now: Date }) {
  return database.$transaction(async (transaction) => {
    const member = await authorizeRewards(transaction as PrismaClient, input.actor, "rewards.read", input.now);
    const [rewards, requests] = await Promise.all([
      transaction.reward.findMany({ where: { householdId: member.householdId, archivedAt: null }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
      transaction.rewardRequest.findMany({ where: member.role === "adult" ? { householdId: member.householdId } : { householdId: member.householdId, requesterMemberId: member.id }, orderBy: [{ createdAt: "desc" }, { id: "asc" }] }),
    ]);
    const canManage = authorize({ context: input.actor.context, role: member.role, grants: input.actor.grants, request: { householdId: member.householdId, permission: "rewards.manage", appId: "rewards" }, now: input.now }).allowed;
    const canApprove = authorize({ context: input.actor.context, role: member.role, grants: input.actor.grants, request: { householdId: member.householdId, permission: "rewards.approve", appId: "rewards" }, now: input.now }).allowed;
    return { rewards, requests, canManage, canApprove };
  }, { isolationLevel: "Serializable" });
}

export async function createReward(database: PrismaClient, input: { actor: Actor; label: string; commandId: string; now: Date }) {
  const label = boundedText(input.label, "label"); const commandId = boundedCommandId(input.commandId);
  return database.$transaction(async (transaction) => {
    const member = await authorizeRewards(transaction as PrismaClient, input.actor, "rewards.manage", input.now);
    const existing = await transaction.reward.findUnique({ where: { creationCommandId: commandId } });
    if (existing !== null) { if (existing.householdId !== member.householdId) throw new RewardCommandError("commandId cannot cross household boundaries."); return existing; }
    const reward = await transaction.reward.create({ data: { householdId: member.householdId, label, creationCommandId: commandId } });
    await writeEvidence(transaction as PrismaClient, { householdId: member.householdId, memberId: member.id, action: "reward.create", targetType: "reward", targetId: reward.id, eventType: "reward.created.v1", aggregateType: "reward", aggregateId: reward.id, now: input.now });
    return reward;
  }, { isolationLevel: "Serializable" });
}

export async function requestReward(database: PrismaClient, input: { actor: Actor; rewardId: string; commandId: string; now: Date }) {
  const commandId = boundedCommandId(input.commandId);
  return database.$transaction(async (transaction) => {
    const member = await authorizeRewards(transaction as PrismaClient, input.actor, "rewards.request", input.now);
    const existing = await transaction.rewardRequest.findUnique({ where: { requestCommandId: commandId } });
    if (existing !== null) { if (existing.householdId !== member.householdId || existing.rewardId !== input.rewardId || existing.requesterMemberId !== member.id) throw new RewardCommandError("commandId cannot cross reward, member, or household boundaries."); return existing; }
    const reward = await transaction.reward.findFirst({ where: { id: input.rewardId, householdId: member.householdId, archivedAt: null } });
    if (reward === null) throw new RewardCommandError("The reward is not available to request.");
    const request = await transaction.rewardRequest.create({ data: { householdId: member.householdId, rewardId: reward.id, requesterMemberId: member.id, requestCommandId: commandId } });
    await writeEvidence(transaction as PrismaClient, { householdId: member.householdId, memberId: member.id, action: "reward.request", targetType: "reward-request", targetId: request.id, eventType: "reward.requested.v1", aggregateType: "reward-request", aggregateId: request.id, now: input.now, references: { rewardId: reward.id } });
    return request;
  }, { isolationLevel: "Serializable" });
}

export async function decideRewardRequest(database: PrismaClient, input: { actor: Actor; requestId: string; state: "approved" | "rejected"; commandId: string; now: Date }) {
  const commandId = boundedCommandId(input.commandId);
  return database.$transaction(async (transaction) => {
    const member = await authorizeRewards(transaction as PrismaClient, input.actor, "rewards.approve", input.now);
    const existing = await transaction.rewardRequest.findUnique({ where: { decisionCommandId: commandId } });
    if (existing !== null) { if (existing.householdId !== member.householdId || existing.id !== input.requestId || existing.decidedByMemberId !== member.id || existing.state !== input.state) throw new RewardCommandError("commandId cannot cross reward request boundaries."); return existing; }
    const request = await transaction.rewardRequest.findFirst({ where: { id: input.requestId, householdId: member.householdId, state: "requested" } });
    if (request === null) throw new RewardConflictError("The reward request has already been decided or is unavailable.");
    const updated = await transaction.rewardRequest.updateMany({ where: { id: request.id, householdId: member.householdId, state: "requested" }, data: { state: input.state, decisionCommandId: commandId, decidedByMemberId: member.id, decidedAt: input.now } });
    if (updated.count !== 1) throw new RewardConflictError("The reward request changed before the decision was saved.");
    const decision = await transaction.rewardRequest.findUniqueOrThrow({ where: { id: request.id } });
    await writeEvidence(transaction as PrismaClient, { householdId: member.householdId, memberId: member.id, action: `reward.${input.state}`, targetType: "reward-request", targetId: request.id, eventType: `reward.${input.state}.v1`, aggregateType: "reward-request", aggregateId: request.id, now: input.now, references: { rewardId: request.rewardId, requesterMemberId: request.requesterMemberId } });
    return decision;
  }, { isolationLevel: "Serializable" });
}
