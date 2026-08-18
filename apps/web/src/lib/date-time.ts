import { Temporal } from "@js-temporal/polyfill";

export type DateOnly = string;
export type LocalDateTime = string;
export type IanaTimeZone = string;

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateOnly(value: DateOnly): Temporal.PlainDate {
  if (!dateOnlyPattern.test(value)) {
    throw new RangeError("Date-only values must use YYYY-MM-DD without a time or timezone.");
  }
  return Temporal.PlainDate.from(value);
}

export function localDateTimeToInstant(input: { localDateTime: LocalDateTime; timeZone: IanaTimeZone }): string {
  const local = Temporal.PlainDateTime.from(input.localDateTime);
  const zoned = local.toZonedDateTime(input.timeZone, { disambiguation: "reject" });
  return zoned.toInstant().toString();
}

export function assertIanaTimeZone(timeZone: IanaTimeZone): IanaTimeZone {
  Temporal.ZonedDateTime.from({ year: 2000, month: 1, day: 1, timeZone }, { disambiguation: "reject" });
  return timeZone;
}
