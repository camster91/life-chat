import type { DateOnly, IanaTimeZone } from "./date-time";

export type TodayApiItem = Readonly<{
  id: string;
  appId: string | null;
  label: string;
  deepLink: string;
}>;

export type TodayApiResponse = Readonly<{
  householdName: string;
  date: DateOnly;
  timeZone: IanaTimeZone;
  items: readonly TodayApiItem[];
  overflowCount: number;
}>;
