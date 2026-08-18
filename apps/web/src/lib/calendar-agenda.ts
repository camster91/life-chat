import { Temporal } from "@js-temporal/polyfill";
import { assertIanaTimeZone, localDateTimeToInstant, parseDateOnly, type DateOnly, type IanaTimeZone, type LocalDateTime } from "./date-time";
import type { ActiveHouseholdContext } from "./identity-context";

export type CalendarAgendaItem = Readonly<{
  id: string;
  householdId: string;
  title: string;
  deepLink: string;
  kind: "all-day" | "timed";
  date: DateOnly | null;
  localStart: LocalDateTime | null;
  eventTimeZone: IanaTimeZone | null;
  startInstant: string | null;
  authorized: true;
}>;

function assertItem(item: CalendarAgendaItem, context: ActiveHouseholdContext): void {
  if (item.householdId !== context.householdId) throw new Error("Calendar item household must match active context");
  if (!item.authorized) throw new Error("Calendar item must be authorized before aggregation");
  if (item.id.trim().length === 0 || item.title.trim().length === 0 || item.title.length > 200) throw new Error("Calendar item must have bounded display data");
  if (!item.deepLink.startsWith("/")) throw new Error("Calendar deep links must be application-relative");
  if (item.kind === "all-day") {
    if (item.date === null || item.localStart !== null || item.eventTimeZone !== null || item.startInstant !== null) throw new Error("All-day items must remain date-only");
    parseDateOnly(item.date);
  } else {
    if (item.date !== null || item.localStart === null || item.eventTimeZone === null || item.startInstant === null) throw new Error("Timed items require local time, timezone, and instant");
    assertIanaTimeZone(item.eventTimeZone);
    if (localDateTimeToInstant({ localDateTime: item.localStart, timeZone: item.eventTimeZone }) !== item.startInstant) throw new Error("Timed item instant must match original local time and timezone");
  }
}

/** Builds a no-write agenda in the household-view timezone from already-authorized canonical records. */
export function createCalendarAgenda(input: {
  context: ActiveHouseholdContext;
  householdTimeZone: IanaTimeZone;
  date: DateOnly;
  items: readonly CalendarAgendaItem[];
}): readonly CalendarAgendaItem[] {
  parseDateOnly(input.date);
  assertIanaTimeZone(input.householdTimeZone);
  return input.items.filter((item) => {
    assertItem(item, input.context);
    if (item.kind === "all-day") return item.date === input.date;
    return Temporal.Instant.from(item.startInstant!).toZonedDateTimeISO(input.householdTimeZone).toPlainDate().toString() === input.date;
  }).sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === "all-day" ? -1 : 1;
    return (left.startInstant ?? "").localeCompare(right.startInstant ?? "") || left.title.localeCompare(right.title);
  });
}
