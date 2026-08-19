import { Temporal } from "@js-temporal/polyfill";
import { assertIanaTimeZone, localDateTimeToInstant, parseDateOnly, type DateOnly, type IanaTimeZone, type LocalDateTime } from "./date-time";
import type { ActiveHouseholdContext } from "./identity-context";
import { isSafeApplicationPath } from "./application-path";

export type CalendarAgendaItem = Readonly<{
  id: string;
  householdId: string;
  title: string;
  deepLink: string;
  kind: "all-day" | "timed";
  startDate: DateOnly | null;
  endDateExclusive: DateOnly | null;
  localStart: LocalDateTime | null;
  localEnd: LocalDateTime | null;
  eventTimeZone: IanaTimeZone | null;
  startInstant: string | null;
  endInstant: string | null;
  authorized: true;
}>;

function assertItem(item: CalendarAgendaItem, context: ActiveHouseholdContext): void {
  if (item.householdId !== context.householdId) throw new Error("Calendar item household must match active context");
  if (!item.authorized) throw new Error("Calendar item must be authorized before aggregation");
  if (item.id.trim().length === 0 || item.title.trim().length === 0 || item.title.length > 200) throw new Error("Calendar item must have bounded display data");
  if (!isSafeApplicationPath(item.deepLink)) throw new Error("Calendar deep links must be application-relative");
  if (item.kind === "all-day") {
    if (item.startDate === null || item.endDateExclusive === null || item.localStart !== null || item.localEnd !== null || item.eventTimeZone !== null || item.startInstant !== null || item.endInstant !== null) throw new Error("All-day items must remain date-only");
    parseDateOnly(item.startDate);
    parseDateOnly(item.endDateExclusive);
    if (item.startDate >= item.endDateExclusive) throw new Error("All-day item end must be after start");
  } else {
    if (item.startDate !== null || item.endDateExclusive !== null || item.localStart === null || item.localEnd === null || item.eventTimeZone === null || item.startInstant === null || item.endInstant === null) throw new Error("Timed items require local range, timezone, and instants");
    assertIanaTimeZone(item.eventTimeZone);
    if (localDateTimeToInstant({ localDateTime: item.localStart, timeZone: item.eventTimeZone }) !== item.startInstant) throw new Error("Timed item instant must match original local time and timezone");
    if (localDateTimeToInstant({ localDateTime: item.localEnd, timeZone: item.eventTimeZone }) !== item.endInstant) throw new Error("Timed item end instant must match original local time and timezone");
    if (Temporal.Instant.compare(item.startInstant, item.endInstant) >= 0) throw new Error("Timed item end must be after start");
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
    if (item.kind === "all-day") return item.startDate! <= input.date && input.date < item.endDateExclusive!;
    const dayStart = Temporal.PlainDate.from(input.date).toZonedDateTime(input.householdTimeZone).toInstant();
    const dayEnd = Temporal.PlainDate.from(input.date).add({ days: 1 }).toZonedDateTime(input.householdTimeZone).toInstant();
    return Temporal.Instant.compare(item.startInstant!, dayEnd) < 0 && Temporal.Instant.compare(item.endInstant!, dayStart) > 0;
  }).sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === "all-day" ? -1 : 1;
    return (left.startInstant ?? "").localeCompare(right.startInstant ?? "") || left.title.localeCompare(right.title);
  });
}
