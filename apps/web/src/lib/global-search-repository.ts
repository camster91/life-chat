import type { PrismaClient } from "../../generated/prisma/client";
import type { ActiveHouseholdContext } from "./identity-context";
import { loadHouseholdMiniAppConfiguration } from "./identity-repository";
import { activationEligibility } from "./mini-app-registry";
import { authorize, type CapabilityGrant } from "./permission-engine";
import { createSearchResults, type SearchResultGroup } from "./global-search";

/**
 * Retrieval is deliberately query-time and policy-specific. It does not create a
 * cross-app index or send household data to a semantic provider.
 */
export async function searchAuthorizedRecords(database: PrismaClient, input: {
  context: ActiveHouseholdContext;
  grants: readonly CapabilityGrant[];
  query: string;
  now: Date;
}): Promise<readonly SearchResultGroup[]> {
  const query = input.query.trim();
  if (query.length < 2 || query.length > 120) throw new SearchQueryError("Search query must be between 2 and 120 characters.");

  return database.$transaction(async (transaction) => {
    const member = await transaction.member.findFirst({ where: {
      id: input.context.memberId,
      householdId: input.context.householdId,
      authenticatedSubjectId: input.context.authenticatedSubjectId,
      lifecycle: "active",
      OR: [{ expiresAt: null }, { expiresAt: { gt: input.now } }],
    } });
    if (member === null || member.role === "guest") throw new SearchAccessError("Search is not available to this household member.");

    const configuration = await loadHouseholdMiniAppConfiguration(transaction as PrismaClient, member.householdId);
    const canReadCalendar = authorize({ context: input.context, role: member.role, grants: input.grants, request: { householdId: member.householdId, permission: "calendar.read" }, now: input.now }).allowed;
    const canReadLists = activationEligibility("shared-lists", configuration).eligible
      && authorize({ context: input.context, role: member.role, grants: input.grants, request: { householdId: member.householdId, permission: "lists.read", appId: "shared-lists" }, now: input.now }).allowed;
    const canReadChores = activationEligibility("chores", configuration).eligible
      && authorize({ context: input.context, role: member.role, grants: input.grants, request: { householdId: member.householdId, permission: "chores.complete-assigned", appId: "chores" }, now: input.now }).allowed;

    const [calendarItems, lists, listItems, chores] = await Promise.all([
      canReadCalendar ? transaction.calendarItem.findMany({
        where: { householdId: member.householdId, archivedAt: null, OR: [{ visibility: "household" }, { visibility: "personal", ownerMemberId: member.id }], title: { contains: query, mode: "insensitive" } },
        select: { id: true, householdId: true, title: true, kind: true, startDate: true, startLocalDateTime: true },
        orderBy: { title: "asc" }, take: 25,
      }) : [],
      canReadLists ? transaction.sharedList.findMany({
        where: { householdId: member.householdId, archivedAt: null, title: { contains: query, mode: "insensitive" } },
        select: { id: true, householdId: true, title: true }, orderBy: { title: "asc" }, take: 25,
      }) : [],
      canReadLists ? transaction.sharedListItem.findMany({
        where: { householdId: member.householdId, list: { archivedAt: null }, label: { contains: query, mode: "insensitive" } },
        select: { id: true, householdId: true, listId: true, label: true, state: true, list: { select: { title: true } } }, orderBy: { label: "asc" }, take: 25,
      }) : [],
      canReadChores ? transaction.choreAssignment.findMany({
        where: { householdId: member.householdId, assigneeMemberId: member.id, title: { contains: query, mode: "insensitive" } },
        select: { id: true, householdId: true, title: true, dueDate: true, state: true }, orderBy: { title: "asc" }, take: 25,
      }) : [],
    ]);

    return createSearchResults({
      context: input.context,
      configuration,
      query,
      results: [
        ...calendarItems.map((item) => ({
          id: item.id, householdId: item.householdId, appId: null, type: "Calendar", title: item.title,
          snippet: item.kind === "all_day" ? `All day · ${item.startDate}` : `Timed · ${item.startLocalDateTime}`,
          deepLink: `/calendar?date=${encodeURIComponent(item.startDate ?? item.startLocalDateTime!.slice(0, 10))}#calendar-item-${encodeURIComponent(item.id)}`, authorized: true as const,
        })),
        ...lists.map((list) => ({ id: list.id, householdId: list.householdId, appId: "shared-lists" as const, type: "Shared list", title: list.title, snippet: "Shared list", deepLink: `/lists/${encodeURIComponent(list.id)}`, authorized: true as const })),
        ...listItems.map((item) => ({ id: item.id, householdId: item.householdId, appId: "shared-lists" as const, type: "List item", title: item.label, snippet: `${item.list.title} · ${item.state === "open" ? "Open" : "Completed"}`, deepLink: `/lists/${encodeURIComponent(item.listId)}`, authorized: true as const })),
        ...chores.map((chore) => ({ id: chore.id, householdId: chore.householdId, appId: "chores" as const, type: "Chore", title: chore.title, snippet: chore.dueDate === null ? (chore.state === "assigned" ? "Assigned" : "Completed") : `Due ${chore.dueDate} · ${chore.state}`, deepLink: `/chores/assignments/${encodeURIComponent(chore.id)}`, authorized: true as const })),
      ],
    });
  }, { isolationLevel: "Serializable" });
}

export class SearchAccessError extends Error {}
export class SearchQueryError extends Error {}
