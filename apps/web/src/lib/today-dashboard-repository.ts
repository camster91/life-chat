import type { PrismaClient } from "../../generated/prisma/client";
import { assertIanaTimeZone, type DateOnly, type IanaTimeZone } from "./date-time";
import type { ActiveHouseholdContext } from "./identity-context";
import { loadHouseholdMiniAppConfiguration } from "./identity-repository";
import { activationEligibility } from "./mini-app-registry";
import { createTodayDashboard, type TodayDashboard } from "./today-dashboard";

/**
 * Server-side, assignee-only Today source. Lists deliberately remain absent:
 * unordered shared-list items have no due-date or individual visibility rule.
 */
export async function loadTodayDashboard(database: PrismaClient, input: {
  context: ActiveHouseholdContext;
  date: DateOnly;
  timeZone: IanaTimeZone;
}): Promise<TodayDashboard> {
  assertIanaTimeZone(input.timeZone);
  const configuration = await loadHouseholdMiniAppConfiguration(database, input.context.householdId);
  const items = activationEligibility("chores", configuration).eligible
    ? await database.choreAssignment.findMany({
      where: { householdId: input.context.householdId, assigneeMemberId: input.context.memberId, state: "assigned", dueDate: input.date },
      orderBy: { title: "asc" },
    })
    : [];
  return createTodayDashboard({
    context: input.context, date: input.date, timeZone: input.timeZone,
    items: items.map((item) => ({ id: item.id, householdId: item.householdId, appId: "chores", label: item.title, date: input.date, deepLink: `/chores/assignments/${item.id}`, authorized: true as const })),
  });
}
