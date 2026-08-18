import { Temporal } from "@js-temporal/polyfill";
import { parseDateOnly, type DateOnly } from "./date-time";
import type { ActiveHouseholdContext } from "./identity-context";
import { activationEligibility, type HouseholdMiniAppConfiguration } from "./mini-app-registry";

export type HabitRoutineSummary = Readonly<{ id: string; householdId: string; ownerMemberId: string; label: string; completionDates: readonly DateOnly[]; authorized: true }>;
export type HabitProgress = Readonly<{ id: string; label: string; completedToday: boolean; currentStreakDays: number }>;

function dateSet(dates: readonly DateOnly[]): Set<string> {
  const seen = new Set<string>();
  for (const date of dates) {
    parseDateOnly(date);
    if (seen.has(date)) throw new Error("Habit completion dates must be unique");
    seen.add(date);
  }
  return seen;
}

function streakFrom(today: DateOnly, completed: Set<string>): number {
  let date = parseDateOnly(today);
  let streak = 0;
  while (completed.has(date.toString())) { streak += 1; date = date.subtract({ days: 1 }); }
  return streak;
}

/** Calculates a transparent, read-only progress view from already-authorized generic routines. */
export function createHabitProgress(input: { context: ActiveHouseholdContext; configuration: HouseholdMiniAppConfiguration; today: DateOnly; routines: readonly HabitRoutineSummary[] }): readonly HabitProgress[] {
  if (!activationEligibility("habits", input.configuration).eligible) throw new Error("Habits mini-app must be enabled and eligible");
  parseDateOnly(input.today);
  return Object.freeze(input.routines.map((routine) => {
    if (routine.householdId !== input.context.householdId || routine.ownerMemberId !== input.context.memberId) throw new Error("Habit routine must match active member and household");
    if (!routine.authorized || routine.id.trim().length === 0 || routine.label.trim().length === 0 || routine.label.length > 200) throw new Error("Habit routine must be authorized with bounded display data");
    const completed = dateSet(routine.completionDates);
    return Object.freeze({ id: routine.id, label: routine.label, completedToday: completed.has(input.today), currentStreakDays: streakFrom(input.today, completed) });
  }));
}

export function proposeHabitCompletion(input: { routine: HabitRoutineSummary; context: ActiveHouseholdContext; configuration: HouseholdMiniAppConfiguration; date: DateOnly }): Readonly<{ routineId: string; date: DateOnly; requiresConfirmation: true }> {
  createHabitProgress({ context: input.context, configuration: input.configuration, today: input.date, routines: [input.routine] });
  if (input.routine.completionDates.includes(input.date)) throw new Error("Habit is already complete for this date");
  return Object.freeze({ routineId: input.routine.id, date: input.date, requiresConfirmation: true });
}
