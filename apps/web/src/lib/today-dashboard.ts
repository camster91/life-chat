import { isSafeApplicationPath } from "./application-path";
import { assertIanaTimeZone, parseDateOnly, type DateOnly, type IanaTimeZone } from "./date-time";
import type { ActiveHouseholdContext } from "./identity-context";

export type TodayDashboardItem = Readonly<{
  id: string;
  householdId: string;
  appId: string | null;
  label: string;
  date: DateOnly;
  deepLink: string;
  authorized: true;
}>;

export type TodayDashboard = Readonly<{
  date: DateOnly;
  timeZone: IanaTimeZone;
  items: readonly TodayDashboardItem[];
  overflowCount: number;
}>;

const maximumVisibleItems = 3;

function assertSafeItem(item: TodayDashboardItem, context: ActiveHouseholdContext): void {
  if (item.householdId !== context.householdId) throw new Error("Today item household must match active context");
  if (item.authorized !== true) throw new Error("Today items must be authorized before aggregation");
  if (item.id.trim().length === 0 || item.id.length > 200 || item.label.trim().length === 0 || item.label.length > 200) {
    throw new Error("Today item identifiers and labels must be bounded");
  }
  if (!isSafeApplicationPath(item.deepLink)) throw new Error("Today deep links must be application-relative");
}

/**
 * Creates a deliberately small read model from already-authorized summaries.
 * It performs no data lookup, permission grant, mutation, or notification work.
 */
export function createTodayDashboard(input: {
  context: ActiveHouseholdContext;
  date: DateOnly;
  timeZone: IanaTimeZone;
  items: readonly TodayDashboardItem[];
}): TodayDashboard {
  parseDateOnly(input.date);
  assertIanaTimeZone(input.timeZone);
  const todaysItems = input.items.filter((item) => {
    assertSafeItem(item, input.context);
    parseDateOnly(item.date);
    return item.date === input.date;
  });
  const sorted = [...todaysItems].sort((left, right) => left.label.localeCompare(right.label));
  return {
    date: input.date,
    timeZone: input.timeZone,
    items: sorted.slice(0, maximumVisibleItems),
    overflowCount: Math.max(0, sorted.length - maximumVisibleItems),
  };
}
