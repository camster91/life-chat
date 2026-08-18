import { describe, expect, it } from "vitest";
import { createLifeChatFixture } from "./test-fixtures";

describe("Life Chat synthetic fixtures", () => {
  it("contains deterministic isolated households and representative member states", () => {
    const result = createLifeChatFixture();
    expect(result.now).toBe("2026-08-18T12:00:00.000Z");
    expect(result.households.map((household) => household.householdId)).toEqual(["fixture-household-a", "fixture-household-b"]);
    expect(result.households[0]?.members.map((member) => member.role)).toEqual(["adult", "child", "guest", "child"]);
    expect(result.households[0]?.members.some((member) => member.lifecycle === "suspended")).toBe(true);
  });

  it("returns frozen fixture data so one test cannot mutate shared setup", () => {
    const result = createLifeChatFixture();
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.households[0]?.members)).toBe(true);
    expect(Object.isFrozen(result.households[0]?.members[0])).toBe(true);
  });
});
