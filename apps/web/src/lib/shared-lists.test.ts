import { describe, expect, it } from "vitest";
import { createSharedListView, proposeSharedListItemCompletion, type SharedListItemSummary } from "./shared-lists";
import { defaultMiniAppConfiguration } from "./mini-app-registry";
const context = { authenticatedSubjectId: "subject_1", memberId: "member_1", householdId: "household_1" };
const configuration = defaultMiniAppConfiguration(); configuration["shared-lists"].enabled = true;
const item: SharedListItemSummary = { id: "item_1", householdId: "household_1", label: "Pack lunches", position: 1, state: "open", assignedToActiveMember: true, deepLink: "/lists/list_1/items/item_1", authorized: true };
describe("Shared lists", () => {
  it("returns ordered authorized items and a completion proposal", () => { expect(createSharedListView({ context, configuration, items: [item, { ...item, id: "item_0", label: "Buy fruit", position: 0 }] }).map((entry) => entry.id)).toEqual(["item_0", "item_1"]); expect(proposeSharedListItemCompletion({ context, configuration, item })).toEqual({ itemId: "item_1", requiresConfirmation: true }); });
  it("requires the app and rejects duplicate ordering", () => { expect(() => createSharedListView({ context, configuration: defaultMiniAppConfiguration(), items: [item] })).toThrow("enabled and eligible"); expect(() => createSharedListView({ context, configuration, items: [item, { ...item, id: "item_2" }] })).toThrow("unique"); });
  it("rejects cross-household, unsafe links, and completed item changes", () => { expect(() => createSharedListView({ context, configuration, items: [{ ...item, householdId: "household_2" }] })).toThrow("active household"); expect(() => createSharedListView({ context, configuration, items: [{ ...item, deepLink: "https://outside.example" }] })).toThrow("internal link"); expect(() => proposeSharedListItemCompletion({ context, configuration, item: { ...item, state: "completed" } })).toThrow("Only an open"); });
});
