import { Temporal } from "@js-temporal/polyfill";
import { assertIanaTimeZone, type IanaTimeZone } from "./date-time";

export type QuietHours = Readonly<{ startMinute: number; endMinute: number }>;

export type NotificationPreference = Readonly<{
  householdId: string;
  memberId: string;
  remindersEnabled: boolean;
  quietHours: QuietHours | null;
  timeZone: IanaTimeZone;
}>;

function assertMinuteOfDay(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 1439) {
    throw new RangeError("Quiet-hour minutes must be integers from 0 through 1439.");
  }
}

export function createNotificationPreference(input: NotificationPreference): NotificationPreference {
  assertIanaTimeZone(input.timeZone);
  if (input.quietHours !== null) {
    assertMinuteOfDay(input.quietHours.startMinute);
    assertMinuteOfDay(input.quietHours.endMinute);
    if (input.quietHours.startMinute === input.quietHours.endMinute) {
      throw new RangeError("Quiet hours must have different start and end times.");
    }
  }
  return Object.freeze({
    ...input,
    quietHours: input.quietHours === null ? null : Object.freeze({ ...input.quietHours }),
  });
}

export type NotificationDeliveryDecision =
  | Readonly<{ kind: "suppressed"; reason: "reminders-disabled" }>
  | Readonly<{ kind: "deliver"; deliverAt: string; deferredByQuietHours: boolean }>;

/** Applies local wall-clock quiet hours; a repeated or skipped end uses the later safe instant. */
export function evaluateNotificationDelivery(input: {
  preference: NotificationPreference;
  requestedAt: string;
}): NotificationDeliveryDecision {
  const preference = createNotificationPreference(input.preference);
  if (!preference.remindersEnabled) return { kind: "suppressed", reason: "reminders-disabled" };
  const requested = Temporal.Instant.from(input.requestedAt);
  if (preference.quietHours === null) {
    return { kind: "deliver", deliverAt: requested.toString(), deferredByQuietHours: false };
  }

  const local = requested.toZonedDateTimeISO(preference.timeZone);
  const minute = local.hour * 60 + local.minute;
  const { startMinute, endMinute } = preference.quietHours;
  const overnight = startMinute > endMinute;
  const withinQuietHours = overnight
    ? minute >= startMinute || minute < endMinute
    : minute >= startMinute && minute < endMinute;
  if (!withinQuietHours) {
    return { kind: "deliver", deliverAt: requested.toString(), deferredByQuietHours: false };
  }

  const endDate = overnight && minute >= startMinute
    ? local.toPlainDate().add({ days: 1 })
    : local.toPlainDate();
  const localEnd = endDate.toPlainDateTime({
    hour: Math.floor(endMinute / 60),
    minute: endMinute % 60,
  });
  const deliverAt = localEnd
    .toZonedDateTime(preference.timeZone, { disambiguation: "later" })
    .toInstant()
    .toString();
  return { kind: "deliver", deliverAt, deferredByQuietHours: true };
}
