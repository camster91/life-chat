import type { InboxNotification } from "./notification-centre";

export type NotificationsApiResponse = Readonly<{
  householdName: string;
  locale: string;
  inbox: readonly InboxNotification[];
  preference: Readonly<{
    remindersEnabled: boolean;
    quietHours: Readonly<{ startMinute: number; endMinute: number }> | null;
    timeZone: string;
  }>;
}>;
