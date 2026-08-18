import { describe, expect, it } from "vitest";
import { createSearchResults, type SearchResultSummary } from "./global-search";
import { defaultMiniAppConfiguration } from "./mini-app-registry";

const context = { authenticatedSubjectId: "subject_1", memberId: "member_1", householdId: "household_1" };
const result = (id: string, title: string, appId: SearchResultSummary["appId"] = null): SearchResultSummary => ({ id, householdId: "household_1", appId, type: "task", title, snippet: null, deepLink: `/tasks/${id}`, authorized: true });

describe("global search", () => {
  it("groups matching authorized results and exposes only safe normal-UI handoffs", () => {
    const results = createSearchResults({ context, configuration: defaultMiniAppConfiguration(), query: "lunch", results: [result("2", "Pack lunch"), result("1", "Lunch plan")] });
    expect(results).toEqual([{ type: "task", results: [result("1", "Lunch plan"), result("2", "Pack lunch")] }]);
  });
  it("omits a result from a disabled mini-app without treating it as access", () => {
    expect(createSearchResults({ context, configuration: defaultMiniAppConfiguration(), query: "habit", results: [result("1", "Habit reminder", "habits")] })).toEqual([]);
  });
  it("rejects cross-household data, unsafe links, and unbounded queries", () => {
    expect(() => createSearchResults({ context, configuration: defaultMiniAppConfiguration(), query: "task", results: [{ ...result("1", "Task"), householdId: "household_2" }] })).toThrow("household");
    expect(() => createSearchResults({ context, configuration: defaultMiniAppConfiguration(), query: "task", results: [{ ...result("1", "Task"), deepLink: "https://outside.example" }] })).toThrow("application-relative");
    expect(() => createSearchResults({ context, configuration: defaultMiniAppConfiguration(), query: "x", results: [] })).toThrow("between 2 and 120");
  });
});
