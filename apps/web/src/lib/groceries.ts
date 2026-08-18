import type { ActiveHouseholdContext } from "./identity-context";
import { activationEligibility, type HouseholdMiniAppConfiguration } from "./mini-app-registry";
export type GroceryItemSummary = Readonly<{ id: string; householdId: string; label: string; quantityText: string | null; category: string | null; state: "open" | "completed"; authorized: true }>;
export function createGroceryList(input: { context: ActiveHouseholdContext; configuration: HouseholdMiniAppConfiguration; items: readonly GroceryItemSummary[] }): readonly GroceryItemSummary[] {
  if (!activationEligibility("groceries", input.configuration).eligible) throw new Error("Groceries mini-app and Shared lists dependency must be enabled and eligible");
  return Object.freeze(input.items.map((item) => {
    if (item.householdId !== input.context.householdId || !item.authorized) throw new Error("Grocery item must match active household and be authorized");
    for (const value of [item.id, item.label, item.quantityText, item.category]) if (value !== null && (value.trim().length === 0 || value.length > 200)) throw new Error("Grocery display data must be bounded");
    return Object.freeze({ ...item });
  }).sort((left, right) => (left.state === right.state ? (left.category ?? "").localeCompare(right.category ?? "") || left.label.localeCompare(right.label) : left.state === "open" ? -1 : 1)));
}
export function proposeGroceryItemCompletion(input: { context: ActiveHouseholdContext; configuration: HouseholdMiniAppConfiguration; item: GroceryItemSummary }): Readonly<{ itemId: string; requiresConfirmation: true }> {
  createGroceryList({ context: input.context, configuration: input.configuration, items: [input.item] });
  if (input.item.state !== "open") throw new Error("Only an open grocery item may be proposed for completion");
  return Object.freeze({ itemId: input.item.id, requiresConfirmation: true });
}
