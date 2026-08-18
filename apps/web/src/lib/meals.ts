import { parseDateOnly, type DateOnly } from "./date-time";
import type { ActiveHouseholdContext } from "./identity-context";
import { activationEligibility, type HouseholdMiniAppConfiguration } from "./mini-app-registry";

export type MealPlanSummary = Readonly<{ id: string; householdId: string; date: DateOnly; mealSlot: "breakfast" | "lunch" | "dinner" | "other"; label: string; recipeDeepLink: string | null; authorized: true }>;

/** Builds a date-only meal plan view from already-authorized summaries; it has no recipe or grocery side effect. */
export function createMealPlan(input: { context: ActiveHouseholdContext; configuration: HouseholdMiniAppConfiguration; date: DateOnly; entries: readonly MealPlanSummary[] }): readonly MealPlanSummary[] {
  if (!activationEligibility("meals", input.configuration).eligible) throw new Error("Meals mini-app must be enabled and eligible");
  parseDateOnly(input.date);
  return Object.freeze(input.entries.filter((entry) => {
    if (entry.householdId !== input.context.householdId || !entry.authorized) throw new Error("Meal plan entry must match active household and be authorized");
    if (entry.id.trim().length === 0 || entry.label.trim().length === 0 || entry.label.length > 200) throw new Error("Meal plan display data must be bounded");
    if (entry.recipeDeepLink !== null && !entry.recipeDeepLink.startsWith("/")) throw new Error("Meal recipe links must be application-relative");
    parseDateOnly(entry.date);
    return entry.date === input.date;
  }).sort((left, right) => left.mealSlot.localeCompare(right.mealSlot) || left.label.localeCompare(right.label)));
}

/** Plan changes are a review-only request; no calendar/list/recipe record is changed. */
export function proposeMealPlanChange(input: { context: ActiveHouseholdContext; configuration: HouseholdMiniAppConfiguration; entry: MealPlanSummary }): Readonly<{ entryId: string; requiresConfirmation: true }> {
  createMealPlan({ context: input.context, configuration: input.configuration, date: input.entry.date, entries: [input.entry] });
  return Object.freeze({ entryId: input.entry.id, requiresConfirmation: true });
}
