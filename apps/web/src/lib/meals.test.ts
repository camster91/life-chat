import { describe, expect, it } from "vitest";
import { createMealPlan, proposeMealPlanChange, type MealPlanSummary } from "./meals";
import { defaultMiniAppConfiguration } from "./mini-app-registry";

const context = { authenticatedSubjectId: "subject_1", memberId: "member_1", householdId: "household_1" };
const configuration = defaultMiniAppConfiguration(); configuration.meals.enabled = true;
const entry: MealPlanSummary = { id: "meal_1", householdId: "household_1", date: "2026-08-18", mealSlot: "dinner", label: "Pasta", recipeDeepLink: "/recipes/recipe_1", authorized: true };

describe("Meals", () => {
  it("returns date-only authorized entries and a review-only plan change", () => {
    expect(createMealPlan({ context, configuration, date: "2026-08-18", entries: [entry] })).toEqual([entry]);
    expect(proposeMealPlanChange({ context, configuration, entry })).toEqual({ entryId: "meal_1", requiresConfirmation: true });
  });
  it("requires an eligible app and excludes other local dates", () => {
    expect(() => createMealPlan({ context, configuration: defaultMiniAppConfiguration(), date: "2026-08-18", entries: [entry] })).toThrow("enabled and eligible");
    expect(createMealPlan({ context, configuration, date: "2026-08-19", entries: [entry] })).toEqual([]);
  });
  it("rejects cross-household records, unsafe recipe links, and timestamps", () => {
    expect(() => createMealPlan({ context, configuration, date: "2026-08-18", entries: [{ ...entry, householdId: "household_2" }] })).toThrow("active household");
    expect(() => createMealPlan({ context, configuration, date: "2026-08-18", entries: [{ ...entry, recipeDeepLink: "https://outside.example" }] })).toThrow("application-relative");
    expect(() => createMealPlan({ context, configuration, date: "2026-08-18T00:00:00Z", entries: [] })).toThrow("YYYY-MM-DD");
  });
});
