import type { PrismaClient } from "../../generated/prisma/client";
import type { ActiveHouseholdContext } from "./identity-context";
import { loadHouseholdMiniAppConfiguration } from "./identity-repository";
import { activationEligibility } from "./mini-app-registry";
import { authorize, type CapabilityGrant } from "./permission-engine";
import { createSharedList, SharedListCommandError } from "./shared-list-repository";

export class GroceryCommandError extends Error {}
type Actor = { context: ActiveHouseholdContext; grants: readonly CapabilityGrant[] };
async function authorizeGroceries(database: PrismaClient, actor: Actor, permission: "groceries.read" | "groceries.manage", now: Date) {
  const member = await database.member.findFirst({ where: { id: actor.context.memberId, householdId: actor.context.householdId, authenticatedSubjectId: actor.context.authenticatedSubjectId, lifecycle: "active", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } });
  if (member === null || member.role === "guest") throw new GroceryCommandError("Groceries is not available to this household member.");
  if (!authorize({ context: actor.context, role: member.role, grants: actor.grants, request: { householdId: member.householdId, permission, appId: "groceries" }, now }).allowed) throw new GroceryCommandError("Groceries is not available to this household member.");
  const configuration = await loadHouseholdMiniAppConfiguration(database, member.householdId); if (!activationEligibility("groceries", configuration).eligible) throw new GroceryCommandError("Groceries and Shared Lists must be enabled for this household."); return member;
}
export async function loadGroceryLists(database: PrismaClient, input: { actor: Actor; now: Date }) { return database.$transaction(async (transaction) => { const member = await authorizeGroceries(transaction as PrismaClient, input.actor, "groceries.read", input.now); const lists = await transaction.sharedList.findMany({ where: { householdId: member.householdId, purpose: "grocery", archivedAt: null }, include: { _count: { select: { items: { where: { state: "open" } } } } }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }] }); const canManage = authorize({ context: input.actor.context, role: member.role, grants: input.actor.grants, request: { householdId: member.householdId, permission: "groceries.manage", appId: "groceries" }, now: input.now }).allowed; return { lists, canManage }; }, { isolationLevel: "Serializable" }); }
export async function createGroceryList(database: PrismaClient, input: { actor: Actor; title: string; commandId: string; now: Date }) { try { await authorizeGroceries(database, input.actor, "groceries.manage", input.now); return await createSharedList(database, { actor: input.actor, title: input.title, purpose: "grocery", commandId: input.commandId, now: input.now }); } catch (error) { if (error instanceof SharedListCommandError) throw new GroceryCommandError(error.message); throw error; } }
