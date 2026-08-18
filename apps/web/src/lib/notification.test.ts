import { describe, expect, it } from "vitest";
import {
  canPresentInInbox,
  createNotification,
  notificationDeduplicationKey,
  transitionNotification,
} from "./notification";

const input = {
  id: "notification_1",
  householdId: "household_1",
  recipientMemberId: "member_1",
  templateId: "task.due",
  sourceEventId: "event_1",
  references: { taskId: "task_1" },
  deliverAt: "2026-08-18T14:00:00.000Z",
};

describe("notification contract", () => {
  it("creates a scheduled, redacted envelope with stable deduplication", () => {
    const notification = createNotification(input);

    expect(notification.state).toBe("scheduled");
    expect(notificationDeduplicationKey("event_1", "member_1", "task.due")).toBe(
      notification.deduplicationKey,
    );
    expect(Object.isFrozen(notification.references)).toBe(true);
  });

  it("rejects content-bearing references and non-instant delivery times", () => {
    expect(() => createNotification({ ...input, references: { messageBody: "private" } })).toThrow(
      "Unsafe notification reference",
    );
    expect(() => createNotification({ ...input, deliverAt: "tomorrow" })).toThrow(
      "exact instant",
    );
  });

  it("only exposes due scheduled notifications in the inbox", () => {
    const notification = createNotification(input);
    expect(canPresentInInbox(notification, "2026-08-18T13:59:59.999Z")).toBe(false);
    expect(canPresentInInbox(notification, "2026-08-18T14:00:00.000Z")).toBe(true);
  });

  it("requires the recipient to read or dismiss an available notification", () => {
    const available = transitionNotification(createNotification(input), "available", "system");
    expect(() => transitionNotification(available, "read", "member_2")).toThrow("Invalid notification");
    expect(transitionNotification(available, "read", "member_1").state).toBe("read");
  });
});
