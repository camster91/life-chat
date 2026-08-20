export type HabitProgressApiItem = Readonly<{ id: string; label: string; completedToday: boolean; currentStreakDays: number }>;

export type HabitsApiResponse = Readonly<{
  householdName: string;
  today: string;
  canManage: boolean;
  habits: readonly HabitProgressApiItem[];
}>;
