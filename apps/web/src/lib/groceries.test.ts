import { describe, expect, it } from "vitest";
import { createGroceryList, proposeGroceryItemCompletion, type GroceryItemSummary } from "./groceries";
import { defaultMiniAppConfiguration } from "./mini-app-registry";
const context = { authenticatedSubjectId: "subject_1", memberId: "member_1", householdId: "household_1" };
const groceryConfiguration = defaultMiniAppConfiguration(); groceryConfiguration["shared-lists"].enabled = true; groceryConfiguration.groceries.enabled = true;
const item: GroceryItemSummary = { id: "grocery_1", householdId: "household_1", label: "Apples", quantityText: "1½ bags", category: "Produce", state: "open", authorized: true };
describe("Groceries", () => {
  it("preserves quantity text and makes a confirmation-only completion proposal", () => { expect(createGroceryList({ context, configuration: groceryConfiguration, items: [item] })).toEqual([item]); expect(proposeGroceryItemCompletion({ context, configuration: groceryConfiguration, item })).toEqual({ itemId: "grocery_1", requiresConfirmation: true }); });
  it("requires the Shared lists dependency and rejects invalid completion", () => { expect(() => createGroceryList({ context, configuration: defaultMiniAppConfiguration(), items: [item] })).toThrow("enabled and eligible"); expect(() => proposeGroceryItemCompletion({ context, configuration: groceryConfiguration, item: { ...item, state: "completed" } })).toThrow("Only an open"); });
  it("rejects cross-household and unsafe display items", () => { expect(() => createGroceryList({ context, configuration: groceryConfiguration, items: [{ ...item, householdId: "household_2" }] })).toThrow("active household"); expect(() => createGroceryList({ context, configuration: groceryConfiguration, items: [{ ...item, quantityText: "" }] })).toThrow("bounded"); });
});
