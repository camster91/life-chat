import type { PrismaClient } from "../../generated/prisma/client";
import type { ActiveHouseholdContext } from "./identity-context";
import { loadHouseholdMiniAppConfiguration } from "./identity-repository";
import { activationEligibility } from "./mini-app-registry";
import { createSearchResults, type SearchResultGroup } from "./global-search";

/**
 * Initial server retrieval deliberately covers only assignee-visible chores.
 * Other modules must add an explicit record-visibility policy before indexing.
 */
export async function searchAuthorizedRecords(database: PrismaClient, input: { context: ActiveHouseholdContext; query: string }): Promise<readonly SearchResultGroup[]> {
  const configuration = await loadHouseholdMiniAppConfiguration(database, input.context.householdId);
  const chores = activationEligibility("chores", configuration).eligible
    ? await database.choreAssignment.findMany({
      where: { householdId: input.context.householdId, assigneeMemberId: input.context.memberId, title: { contains: input.query.trim(), mode: "insensitive" } },
      take: 25, orderBy: { title: "asc" },
    })
    : [];
  return createSearchResults({
    context: input.context, configuration, query: input.query,
    results: chores.map((chore) => ({ id: chore.id, householdId: chore.householdId, appId: "chores", type: "Chore", title: chore.title, snippet: chore.dueDate === null ? null : `Due ${chore.dueDate}`, deepLink: `/chores/assignments/${chore.id}`, authorized: true as const })),
  });
}
