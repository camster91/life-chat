import { describe, expect, it } from "vitest";
import { SearchQueryError, searchAuthorizedRecords } from "./global-search-repository";

describe("searchAuthorizedRecords", () => {
  it("classifies malformed queries separately from authorization failures", async () => {
    const database = { $transaction: () => { throw new Error("A malformed query must not query the database."); } };
    const input = { context: { authenticatedSubjectId: "subject", memberId: "member", householdId: "household" }, grants: [], now: new Date("2026-08-20T12:00:00.000Z") };
    await expect(searchAuthorizedRecords(database as never, { ...input, query: " " })).rejects.toThrow(SearchQueryError);
    await expect(searchAuthorizedRecords(database as never, { ...input, query: "x".repeat(121) })).rejects.toThrow(SearchQueryError);
  });
});
