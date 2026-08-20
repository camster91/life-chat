import type { PrismaClient } from "../../generated/prisma/client";
import { createAuditEvent, createDomainEvent, newCorrelationId } from "./audit-event";
import type { ActiveHouseholdContext } from "./identity-context";
import { loadHouseholdMiniAppConfiguration } from "./identity-repository";
import { activationEligibility } from "./mini-app-registry";
import { authorize, type CapabilityGrant, type Permission } from "./permission-engine";

export class SharedListCommandError extends Error {}
export class SharedListConflictError extends SharedListCommandError {}

type Actor = { context: ActiveHouseholdContext; grants: readonly CapabilityGrant[] };

function boundedText(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > 200 || /[\r\n\u0000]/.test(normalized)) {
    throw new SharedListCommandError(`${field} must be 1–200 characters without control characters.`);
  }
  return normalized;
}

function boundedCommandId(value: string): string {
  if (value.trim().length === 0 || value.length > 200) throw new SharedListCommandError("commandId must be a bounded opaque identifier.");
  return value;
}

async function authorizeListAccess(database: PrismaClient, actor: Actor, permission: Extract<Permission, "lists.read" | "lists.complete" | "lists.manage">, now: Date) {
  const member = await database.member.findFirst({ where: {
    id: actor.context.memberId, householdId: actor.context.householdId,
    authenticatedSubjectId: actor.context.authenticatedSubjectId, lifecycle: "active",
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  } });
  if (member === null) throw new SharedListCommandError("The active member is no longer eligible to use lists.");
  const decision = authorize({ context: actor.context, role: member.role, grants: actor.grants, request: { householdId: member.householdId, permission, appId: "shared-lists" }, now });
  if (!decision.allowed) throw new SharedListCommandError("The active member cannot use shared lists.");
  const configuration = await loadHouseholdMiniAppConfiguration(database, member.householdId);
  if (!activationEligibility("shared-lists", configuration).eligible) throw new SharedListCommandError("Shared Lists is not enabled for this household.");
  return member;
}

async function authorizeListManagement(database: PrismaClient, actor: Actor, now: Date) {
  return authorizeListAccess(database, actor, "lists.manage", now);
}

export async function loadSharedLists(database: PrismaClient, input: { actor: Actor; now: Date }) {
  return database.$transaction(async (transaction) => {
    const member = await authorizeListAccess(transaction as PrismaClient, input.actor, "lists.read", input.now);
    return transaction.sharedList.findMany({
      where: { householdId: member.householdId, archivedAt: null },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      include: { _count: { select: { items: { where: { state: "open" } } } } },
    });
  }, { isolationLevel: "Serializable" });
}

export async function loadSharedList(database: PrismaClient, input: { actor: Actor; listId: string; now: Date }) {
  return database.$transaction(async (transaction) => {
    const member = await authorizeListAccess(transaction as PrismaClient, input.actor, "lists.read", input.now);
    const list = await transaction.sharedList.findFirst({
      where: { id: input.listId, householdId: member.householdId, archivedAt: null },
      include: { items: { orderBy: [{ position: "asc" }, { id: "asc" }] } },
    });
    if (list === null) throw new SharedListCommandError("The requested open list is not available.");
    return list;
  }, { isolationLevel: "Serializable" });
}

export async function createSharedList(database: PrismaClient, input: { actor: Actor; title: string; purpose?: "general" | "grocery"; commandId: string; now: Date }) {
  const title = boundedText(input.title, "title");
  const purpose = input.purpose ?? "general";
  const commandId = boundedCommandId(input.commandId);
  return database.$transaction(async (transaction) => {
    const member = await authorizeListManagement(transaction as PrismaClient, input.actor, input.now);
    const existing = await transaction.sharedList.findUnique({ where: { creationCommandId: commandId } });
    if (existing !== null) {
      if (existing.householdId !== member.householdId) throw new SharedListCommandError("commandId cannot cross household boundaries.");
      return existing;
    }
    const correlationId = newCorrelationId();
    const list = await transaction.sharedList.create({ data: { householdId: member.householdId, title, purpose, creationCommandId: commandId } });
    const auditEvent = createAuditEvent({ householdId: member.householdId, actor: { type: "member", id: member.id }, action: "shared-list.create", target: { type: "shared-list", id: list.id }, outcome: "succeeded", correlationId, causationId: null, occurredAt: input.now.toISOString(), metadata: {} });
    const domainEvent = createDomainEvent({ householdId: member.householdId, aggregate: { type: "shared-list", id: list.id }, type: "shared-list.created.v1", correlationId, causationId: auditEvent.id, occurredAt: input.now.toISOString(), references: {} });
    await transaction.auditEvent.create({ data: { id: auditEvent.id, householdId: auditEvent.householdId, actorType: auditEvent.actor.type, actorId: auditEvent.actor.id, action: auditEvent.action, targetType: auditEvent.target.type, targetId: auditEvent.target.id, outcome: auditEvent.outcome, correlationId: auditEvent.correlationId, causationId: auditEvent.causationId, metadata: auditEvent.metadata, occurredAt: new Date(auditEvent.occurredAt) } });
    await transaction.outboxEvent.create({ data: { id: domainEvent.id, householdId: domainEvent.householdId, aggregateType: domainEvent.aggregate.type, aggregateId: domainEvent.aggregate.id, eventType: domainEvent.type, schemaVersion: domainEvent.schemaVersion, correlationId: domainEvent.correlationId, causationId: domainEvent.causationId, references: domainEvent.references, occurredAt: new Date(domainEvent.occurredAt) } });
    return list;
  }, { isolationLevel: "Serializable" });
}

export async function addSharedListItem(database: PrismaClient, input: { actor: Actor; listId: string; label: string; commandId: string; now: Date }) {
  const label = boundedText(input.label, "label");
  const commandId = boundedCommandId(input.commandId);
  return database.$transaction(async (transaction) => {
    const member = await authorizeListManagement(transaction as PrismaClient, input.actor, input.now);
    const existing = await transaction.sharedListItem.findUnique({ where: { creationCommandId: commandId } });
    if (existing !== null) {
      if (existing.householdId !== member.householdId || existing.listId !== input.listId) throw new SharedListCommandError("commandId cannot cross list or household boundaries.");
      return existing;
    }
    const list = await transaction.sharedList.findFirst({ where: { id: input.listId, householdId: member.householdId, archivedAt: null } });
    if (list === null) throw new SharedListCommandError("The requested open list is not in the active household.");
    const last = await transaction.sharedListItem.findFirst({ where: { listId: list.id }, orderBy: { position: "desc" } });
    const item = await transaction.sharedListItem.create({ data: { householdId: member.householdId, listId: list.id, label, position: (last?.position ?? -1) + 1, creationCommandId: commandId } });
    await transaction.sharedList.update({ where: { id: list.id }, data: { version: { increment: 1 } } });
    const correlationId = newCorrelationId();
    const auditEvent = createAuditEvent({ householdId: member.householdId, actor: { type: "member", id: member.id }, action: "shared-list.item.create", target: { type: "shared-list-item", id: item.id }, outcome: "succeeded", correlationId, causationId: null, occurredAt: input.now.toISOString(), metadata: {} });
    const domainEvent = createDomainEvent({ householdId: member.householdId, aggregate: { type: "shared-list", id: list.id }, type: "shared-list.item-created.v1", correlationId, causationId: auditEvent.id, occurredAt: input.now.toISOString(), references: { itemId: item.id } });
    await transaction.auditEvent.create({ data: { id: auditEvent.id, householdId: auditEvent.householdId, actorType: auditEvent.actor.type, actorId: auditEvent.actor.id, action: auditEvent.action, targetType: auditEvent.target.type, targetId: auditEvent.target.id, outcome: auditEvent.outcome, correlationId: auditEvent.correlationId, causationId: auditEvent.causationId, metadata: auditEvent.metadata, occurredAt: new Date(auditEvent.occurredAt) } });
    await transaction.outboxEvent.create({ data: { id: domainEvent.id, householdId: domainEvent.householdId, aggregateType: domainEvent.aggregate.type, aggregateId: domainEvent.aggregate.id, eventType: domainEvent.type, schemaVersion: domainEvent.schemaVersion, correlationId: domainEvent.correlationId, causationId: domainEvent.causationId, references: domainEvent.references, occurredAt: new Date(domainEvent.occurredAt) } });
    return item;
  }, { isolationLevel: "Serializable" });
}

export async function completeSharedListItem(database: PrismaClient, input: { actor: Actor; listId: string; itemId: string; expectedVersion: number; commandId: string; now: Date }) {
  const commandId = boundedCommandId(input.commandId);
  if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1) throw new SharedListCommandError("expectedVersion must be a positive integer.");
  try {
    return await database.$transaction(async (transaction) => {
    const member = await authorizeListAccess(transaction as PrismaClient, input.actor, "lists.complete", input.now);
    const existing = await transaction.sharedListItem.findUnique({ where: { completionCommandId: commandId } });
    if (existing !== null) {
      const isAuthorizedReplay = existing.householdId === member.householdId
        && existing.listId === input.listId
        && existing.id === input.itemId
        && existing.state === "completed"
        && existing.completedByMemberId === member.id;
      if (!isAuthorizedReplay) throw new SharedListCommandError("commandId cannot cross item, list, member, or household boundaries.");
      return existing;
    }
    const item = await transaction.sharedListItem.findFirst({ where: {
      id: input.itemId,
      listId: input.listId,
      householdId: member.householdId,
      state: "open",
      list: { archivedAt: null },
    } });
    if (item === null) throw new SharedListCommandError("The requested open item is not available to complete.");
    if (item.version !== input.expectedVersion) throw new SharedListConflictError("The item changed after it was loaded.");
    const updated = await transaction.sharedListItem.updateMany({
      where: { id: item.id, householdId: member.householdId, listId: input.listId, state: "open", version: input.expectedVersion },
      data: { state: "completed", version: { increment: 1 }, completionCommandId: commandId, completedAt: input.now, completedByMemberId: member.id },
    });
    if (updated.count !== 1) throw new SharedListConflictError("The item changed before completion could be saved.");
    await transaction.sharedList.update({ where: { id: input.listId }, data: { version: { increment: 1 } } });
    const correlationId = newCorrelationId();
    const auditEvent = createAuditEvent({ householdId: member.householdId, actor: { type: "member", id: member.id }, action: "shared-list.item.complete", target: { type: "shared-list-item", id: item.id }, outcome: "succeeded", correlationId, causationId: null, occurredAt: input.now.toISOString(), metadata: { previousVersion: item.version } });
    const domainEvent = createDomainEvent({ householdId: member.householdId, aggregate: { type: "shared-list", id: input.listId }, type: "shared-list.item-completed.v1", correlationId, causationId: auditEvent.id, occurredAt: input.now.toISOString(), references: { itemId: item.id } });
    await transaction.auditEvent.create({ data: { id: auditEvent.id, householdId: auditEvent.householdId, actorType: auditEvent.actor.type, actorId: auditEvent.actor.id, action: auditEvent.action, targetType: auditEvent.target.type, targetId: auditEvent.target.id, outcome: auditEvent.outcome, correlationId: auditEvent.correlationId, causationId: auditEvent.causationId, metadata: auditEvent.metadata, occurredAt: new Date(auditEvent.occurredAt) } });
    await transaction.outboxEvent.create({ data: { id: domainEvent.id, householdId: domainEvent.householdId, aggregateType: domainEvent.aggregate.type, aggregateId: domainEvent.aggregate.id, eventType: domainEvent.type, schemaVersion: domainEvent.schemaVersion, correlationId: domainEvent.correlationId, causationId: domainEvent.causationId, references: domainEvent.references, occurredAt: new Date(domainEvent.occurredAt) } });
    return transaction.sharedListItem.findUniqueOrThrow({ where: { id: item.id } });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") {
      throw new SharedListConflictError("The item changed before completion could be saved.");
    }
    throw error;
  }
}

export async function reopenSharedListItem(database: PrismaClient, input: { actor: Actor; listId: string; itemId: string; expectedVersion: number; commandId: string; now: Date }) {
  const commandId = boundedCommandId(input.commandId);
  if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1) throw new SharedListCommandError("expectedVersion must be a positive integer.");
  try {
    return await database.$transaction(async (transaction) => {
      const member = await authorizeListManagement(transaction as PrismaClient, input.actor, input.now);
      const existing = await transaction.sharedListItem.findUnique({ where: { reopenCommandId: commandId } });
      if (existing !== null) {
        const isAuthorizedReplay = existing.householdId === member.householdId
          && existing.listId === input.listId
          && existing.id === input.itemId
          && existing.state === "open";
        if (!isAuthorizedReplay) throw new SharedListCommandError("commandId cannot cross item, list, or household boundaries.");
        return existing;
      }
      const item = await transaction.sharedListItem.findFirst({ where: {
        id: input.itemId,
        listId: input.listId,
        householdId: member.householdId,
        state: "completed",
        list: { archivedAt: null },
      } });
      if (item === null) throw new SharedListCommandError("The requested completed item is not available to reopen.");
      if (item.version !== input.expectedVersion) throw new SharedListConflictError("The item changed after it was loaded.");
      const updated = await transaction.sharedListItem.updateMany({
        where: { id: item.id, householdId: member.householdId, listId: input.listId, state: "completed", version: input.expectedVersion },
        data: { state: "open", version: { increment: 1 }, reopenCommandId: commandId, completedAt: null, completedByMemberId: null },
      });
      if (updated.count !== 1) throw new SharedListConflictError("The item changed before reopening could be saved.");
      await transaction.sharedList.update({ where: { id: input.listId }, data: { version: { increment: 1 } } });
      const correlationId = newCorrelationId();
      const auditEvent = createAuditEvent({ householdId: member.householdId, actor: { type: "member", id: member.id }, action: "shared-list.item.reopen", target: { type: "shared-list-item", id: item.id }, outcome: "succeeded", correlationId, causationId: null, occurredAt: input.now.toISOString(), metadata: { previousVersion: item.version } });
      const domainEvent = createDomainEvent({ householdId: member.householdId, aggregate: { type: "shared-list", id: input.listId }, type: "shared-list.item-reopened.v1", correlationId, causationId: auditEvent.id, occurredAt: input.now.toISOString(), references: { itemId: item.id } });
      await transaction.auditEvent.create({ data: { id: auditEvent.id, householdId: auditEvent.householdId, actorType: auditEvent.actor.type, actorId: auditEvent.actor.id, action: auditEvent.action, targetType: auditEvent.target.type, targetId: auditEvent.target.id, outcome: auditEvent.outcome, correlationId: auditEvent.correlationId, causationId: auditEvent.causationId, metadata: auditEvent.metadata, occurredAt: new Date(auditEvent.occurredAt) } });
      await transaction.outboxEvent.create({ data: { id: domainEvent.id, householdId: domainEvent.householdId, aggregateType: domainEvent.aggregate.type, aggregateId: domainEvent.aggregate.id, eventType: domainEvent.type, schemaVersion: domainEvent.schemaVersion, correlationId: domainEvent.correlationId, causationId: domainEvent.causationId, references: domainEvent.references, occurredAt: new Date(domainEvent.occurredAt) } });
      return transaction.sharedListItem.findUniqueOrThrow({ where: { id: item.id } });
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") {
      throw new SharedListConflictError("The item changed before reopening could be saved.");
    }
    throw error;
  }
}
