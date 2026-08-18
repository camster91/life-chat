import { describe, expect, it } from "vitest";
import { createHabitProgress, proposeHabitCompletion, type HabitRoutineSummary } from "./habits";
import { defaultMiniAppConfiguration } from "./mini-app-registry";

const context = { authenticatedSubjectId: "subject_1", memberId: "member_1", householdId: "household_1" };
const configuration = defaultMiniAppConfiguration(); configuration.habits.enabled = true;
const routine: HabitRoutineSummary = { id: "habit_1", householdId: "household_1", ownerMemberId: "member_1", label: "Drink water", completionDates: ["2026-08-16", "2026-08-17"], authorized: true };

describe("Habits", () => {
  it("calculates transparent date-only progress and streaks", () => {
    expect(createHabitProgress({ context, configuration, today: "2026-08-18", routines: [{ ...routine, completionDates: [...routine.completionDates, "2026-08-18"] }] })).toEqual([{ id: "habit_1", label: "Drink water", completedToday: true, currentStreakDays: 3 }]);
  });
  it("requires an eligible app and confirmation for a new completion", () => {
    expect(() => createHabitProgress({ context, configuration: defaultMiniAppConfiguration(), today: "2026-08-18", routines: [routine] })).toThrow("enabled and eligible");
    expect(proposeHabitCompletion({ context, configuration, date: "2026-08-18", routine })).toEqual({ routineId: "habit_1", date: "2026-08-18", requiresConfirmation: true });
  });
  it("rejects cross-member records, duplicate history, and duplicate completion", () => {
    expect(() => createHabitProgress({ context, configuration, today: "2026-08-18", routines: [{ ...routine, ownerMemberId: "member_2" }] })).toThrow("active member");
    expect(() => createHabitProgress({ context, configuration, today: "2026-08-18", routines: [{ ...routine, completionDates: ["2026-08-17", "2026-08-17"] }] })).toThrow("unique");
    expect(() => proposeHabitCompletion({ context, configuration, date: "2026-08-17", routine })).toThrow("already complete");
  });
});
