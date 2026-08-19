import { describe, expect, it } from "vitest";
import { createNotification } from "./notification";
import { createNotificationInbox } from "./notification-centre";

const context = { authenticatedSubjectId: "subject_1", memberId: "member_1", householdId: "household_1" };
const notification = createNotification({ id: "notification_1", householdId: "household_1", recipientMemberId: "member_1", templateId: "task-due", sourceEventId: "event_1", deliverAt: "2026-08-18T12:00:00Z", deepLink: "/tasks/task_1" });

describe("notification centre", () => {
  it("shows only inbox-presentable recipient metadata in newest-first order", () => {
    const inbox = createNotificationInbox({ context, notifications: [{ ...notification, state: "read" }, { ...notification, id: "notification_2", state: "available", deliverAt: "2026-08-18T13:00:00Z" }, notification] });
    expect(inbox).toEqual([{ id: "notification_2", templateId: "task-due", state: "available", deliverAt: "2026-08-18T13:00:00Z", deepLink: "/tasks/task_1" }, { id: "notification_1", templateId: "task-due", state: "read", deliverAt: "2026-08-18T12:00:00Z", deepLink: "/tasks/task_1" }]);
  });
  it("rejects a different household, recipient, or unsafe handoff", () => {
    expect(() => createNotificationInbox({ context, notifications: [{ ...notification, householdId: "household_2", state: "available" }] })).toThrow("household");
    expect(() => createNotificationInbox({ context, notifications: [{ ...notification, recipientMemberId: "member_2", state: "available" }] })).toThrow("recipient");
    expect(() => createNotificationInbox({ context, notifications: [{ ...notification, state: "available", deepLink: "https://outside.example" }] })).toThrow("application-relative");
    expect(() => createNotificationInbox({ context, notifications: [{ ...notification, state: "available", deepLink: "//outside.example" }] })).toThrow("application-relative");
  });
});
