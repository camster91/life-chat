import type { DateOnly, IanaTimeZone, LocalDateTime } from "./date-time";

export type CalendarApiItem = Readonly<{
  id: string;
  title: string;
  kind: "all-day" | "timed";
  deepLink: string;
  startDate: DateOnly | null;
  endDateExclusive: DateOnly | null;
  localStart: LocalDateTime | null;
  localEnd: LocalDateTime | null;
  eventTimeZone: IanaTimeZone | null;
  startInstant: string | null;
  endInstant: string | null;
}>;

export type CalendarApiResponse = Readonly<{
  householdName: string;
  date: DateOnly;
  timeZone: IanaTimeZone;
  locale: string;
  items: readonly CalendarApiItem[];
}>;
