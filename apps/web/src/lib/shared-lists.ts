import type { ActiveHouseholdContext } from "./identity-context";
import { activationEligibility, type HouseholdMiniAppConfiguration } from "./mini-app-registry";

export type SharedListItemSummary = Readonly<{ id: string; householdId: string; label: string; position: number; state: "open" | "completed"; assignedToActiveMember: boolean; deepLink: string; authorized: true }>;

export function createSharedListView(input: { context: ActiveHouseholdContext; configuration: HouseholdMiniAppConfiguration; items: readonly SharedListItemSummary[] }): readonly SharedListItemSummary[] {
  if (!activationEligibility("shared-lists", input.configuration).eligible) throw new Error("Shared lists mini-app must be enabled and eligible");
  const positions = new Set<number>();
  return Object.freeze(input.items.map((item) => {
    if (item.householdId !== input.context.householdId || !item.authorized) throw new Error("Shared list item must match active household and be authorized");
    if (item.id.trim().length === 0 || item.label.trim().length === 0 || item.label.length > 200 || !item.deepLink.startsWith("/")) throw new Error("Shared list item must have bounded display data and an internal link");
    if (!Number.isSafeInteger(item.position) || item.position < 0 || positions.has(item.position)) throw new Error("Shared list item positions must be unique non-negative integers");
    positions.add(item.position);
    return Object.freeze({ ...item });
  }).sort((left, right) => left.position - right.position));
}

export function proposeSharedListItemCompletion(input: { context: ActiveHouseholdContext; configuration: HouseholdMiniAppConfiguration; item: SharedListItemSummary }): Readonly<{ itemId: string; requiresConfirmation: true }> {
  createSharedListView({ context: input.context, configuration: input.configuration, items: [input.item] });
  if (input.item.state !== "open") throw new Error("Only an open shared list item may be proposed for completion");
  return Object.freeze({ itemId: input.item.id, requiresConfirmation: true });
}
