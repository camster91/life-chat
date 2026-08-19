import { describe, expect, it } from "vitest";
import { createNotificationPreference, evaluateNotificationDelivery } from "./notification-preference";

const preference = createNotificationPreference({
  householdId: "household_1",
  memberId: "member_1",
  remindersEnabled: true,
  quietHours: { startMinute: 22 * 60, endMinute: 7 * 60 },
  timeZone: "America/Toronto",
});

describe("notification preference", () => {
  it("defers an overnight quiet-hour request to the local end time", () => {
    expect(evaluateNotificationDelivery({ preference, requestedAt: "2026-08-20T03:00:00Z" })).toEqual({
      kind: "deliver",
      deliverAt: "2026-08-20T11:00:00Z",
      deferredByQuietHours: true,
    });
  });

  it("does not defer outside quiet hours and can suppress reminder scheduling", () => {
    expect(evaluateNotificationDelivery({ preference, requestedAt: "2026-08-20T16:00:00Z" })).toEqual({
      kind: "deliver",
      deliverAt: "2026-08-20T16:00:00Z",
      deferredByQuietHours: false,
    });
    expect(evaluateNotificationDelivery({ preference: { ...preference, remindersEnabled: false }, requestedAt: "2026-08-20T16:00:00Z" })).toEqual({
      kind: "suppressed",
      reason: "reminders-disabled",
    });
  });

  it("chooses the later repeated quiet-hour end during fall DST", () => {
    const repeatedEnd = { ...preference, quietHours: { startMinute: 22 * 60, endMinute: 90 } };
    expect(evaluateNotificationDelivery({ preference: repeatedEnd, requestedAt: "2026-11-01T04:30:00Z" })).toMatchObject({
      deliverAt: "2026-11-01T06:30:00Z",
      deferredByQuietHours: true,
    });
  });

  it("rejects invalid zones and ambiguous full-day quiet-hour ranges", () => {
    expect(() => createNotificationPreference({ ...preference, timeZone: "UTC-05:00" })).toThrow(RangeError);
    expect(() => createNotificationPreference({ ...preference, quietHours: { startMinute: 60, endMinute: 60 } })).toThrow(RangeError);
  });
});
