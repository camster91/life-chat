import type { ActiveHouseholdContext } from "./identity-context";
import { isSafeApplicationPath } from "./application-path";
import type { Notification } from "./notification";

export type InboxNotification = Readonly<{ id: string; templateId: string; state: "available" | "read"; deliverAt: string; deepLink: string | null }>;

/** Builds an inbox from already-authorized notification metadata only; it performs no delivery or state mutation. */
export function createNotificationInbox(input: { context: ActiveHouseholdContext; notifications: readonly Notification[] }): readonly InboxNotification[] {
  return Object.freeze(input.notifications.flatMap((notification): InboxNotification[] => {
    if (notification.householdId !== input.context.householdId) throw new Error("Notification household must match active context");
    if (notification.recipientMemberId !== input.context.memberId) throw new Error("Notification recipient must match active context");
    if (notification.deepLink !== undefined && !isSafeApplicationPath(notification.deepLink)) throw new Error("Notification deep links must be application-relative");
    if (notification.state !== "available" && notification.state !== "read") return [];
    return [{ id: notification.id, templateId: notification.templateId, state: notification.state, deliverAt: notification.deliverAt, deepLink: notification.deepLink ?? null }];
  }).sort((left, right) => Date.parse(right.deliverAt) - Date.parse(left.deliverAt)));
}
