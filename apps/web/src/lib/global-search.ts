import type { ActiveHouseholdContext } from "./identity-context";
import { activationEligibility, type HouseholdMiniAppConfiguration, type MiniAppId } from "./mini-app-registry";

export type SearchResultSummary = Readonly<{
  id: string; householdId: string; appId: MiniAppId | null; type: string; title: string; snippet: string | null; deepLink: string; authorized: true;
}>;
export type SearchResultGroup = Readonly<{ type: string; results: readonly SearchResultSummary[] }>;

function assertResult(result: SearchResultSummary, context: ActiveHouseholdContext): void {
  if (result.householdId !== context.householdId) throw new Error("Search result household must match active context");
  if (!result.authorized) throw new Error("Search result must be authorized before presentation");
  for (const [name, value, maximum] of [["result ID", result.id, 200], ["result type", result.type, 100], ["result title", result.title, 200]] as const) {
    if (value.trim().length === 0 || value.length > maximum) throw new Error(`Search ${name} must be bounded`);
  }
  if (result.snippet !== null && result.snippet.length > 500) throw new Error("Search snippet must be bounded");
  if (!result.deepLink.startsWith("/")) throw new Error("Search deep links must be application-relative");
}

/** Matches supplied, authorized summaries only; no index lookup or permission decision occurs here. */
export function createSearchResults(input: { context: ActiveHouseholdContext; configuration: HouseholdMiniAppConfiguration; query: string; results: readonly SearchResultSummary[] }): readonly SearchResultGroup[] {
  const query = input.query.trim().toLocaleLowerCase();
  if (query.length < 2 || query.length > 120) throw new Error("Search query must be between 2 and 120 characters");
  const matching = input.results.filter((result) => {
    assertResult(result, input.context);
    if (result.appId !== null && !activationEligibility(result.appId, input.configuration).eligible) return false;
    return `${result.title} ${result.snippet ?? ""}`.toLocaleLowerCase().includes(query);
  });
  const groups = new Map<string, SearchResultSummary[]>();
  for (const result of matching) groups.set(result.type, [...(groups.get(result.type) ?? []), result]);
  return Object.freeze([...groups.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([type, results]) => Object.freeze({ type, results: Object.freeze([...results].sort((left, right) => left.title.localeCompare(right.title))) })));
}
