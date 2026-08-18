export const notificationStates = [
  "scheduled",
  "available",
  "read",
  "dismissed",
  "cancelled",
  "failed",
] as const;

export type NotificationState = (typeof notificationStates)[number];

export interface Notification {
  id: string;
  householdId: string;
  recipientMemberId: string;
  templateId: string;
  sourceEventId: string;
  references: Readonly<Record<string, string>>;
  deduplicationKey: string;
  deliverAt: string;
  state: NotificationState;
  deepLink?: string;
}

export interface NotificationInput {
  id: string;
  householdId: string;
  recipientMemberId: string;
  templateId: string;
  sourceEventId: string;
  references?: Readonly<Record<string, string>>;
  deliverAt: string;
  deepLink?: string;
}

const forbiddenReferenceKey =
  /(password|secret|token|authorization|cookie|session|prompt|message|body|attachment|content|email|phone|card|credential|api[-_ ]?key)/i;

function assertOpaqueReference(name: string, value: string): void {
  if (forbiddenReferenceKey.test(name) || value.length === 0 || value.length > 256) {
    throw new Error(`Unsafe notification reference: ${name}`);
  }
}

function assertInstant(value: string): void {
  if (Number.isNaN(Date.parse(value))) {
    throw new Error("Notification delivery time must be an exact instant");
  }
}

export function notificationDeduplicationKey(
  sourceEventId: string,
  recipientMemberId: string,
  templateId: string,
): string {
  return `${sourceEventId}:${recipientMemberId}:${templateId}`;
}

export function createNotification(input: NotificationInput): Notification {
  assertInstant(input.deliverAt);
  for (const [name, value] of Object.entries(input.references ?? {})) {
    assertOpaqueReference(name, value);
  }

  return Object.freeze({
    ...input,
    references: Object.freeze({ ...(input.references ?? {}) }),
    deduplicationKey: notificationDeduplicationKey(
      input.sourceEventId,
      input.recipientMemberId,
      input.templateId,
    ),
    state: "scheduled" as const,
  });
}

export function canPresentInInbox(notification: Notification, now: string): boolean {
  assertInstant(now);
  return notification.state === "scheduled" && Date.parse(notification.deliverAt) <= Date.parse(now);
}

export function transitionNotification(
  notification: Notification,
  nextState: Extract<NotificationState, "available" | "read" | "dismissed" | "cancelled" | "failed">,
  actingMemberId: string,
): Notification {
  if (nextState === "available" && notification.state === "scheduled") {
    return { ...notification, state: "available" };
  }
  if (
    (nextState === "read" || nextState === "dismissed") &&
    notification.state === "available" &&
    notification.recipientMemberId === actingMemberId
  ) {
    return { ...notification, state: nextState };
  }
  if ((nextState === "cancelled" || nextState === "failed") && notification.state === "scheduled") {
    return { ...notification, state: nextState };
  }
  throw new Error(`Invalid notification transition from ${notification.state} to ${nextState}`);
}
