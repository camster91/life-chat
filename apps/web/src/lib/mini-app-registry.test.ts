import { describe, expect, it } from "vitest";
import { activationEligibility, defaultMiniAppConfiguration, miniAppRegistry } from "./mini-app-registry";

describe("mini app registry", () => {
  it("has unique stable identifiers and defaults every app to disabled", () => {
    expect(new Set(miniAppRegistry.map((app) => app.id)).size).toBe(miniAppRegistry.length);
    expect(Object.values(defaultMiniAppConfiguration()).every((configuration) => !configuration.enabled)).toBe(true);
  });

  it("fails closed for unknown and disabled apps", () => {
    const configuration = defaultMiniAppConfiguration();
    expect(activationEligibility("not-an-app", configuration)).toEqual({ eligible: false, reason: "unknown-app" });
    expect(activationEligibility("chores", configuration)).toEqual({ eligible: false, reason: "disabled" });
  });

  it("requires dependencies before activating an enabled app", () => {
    const configuration = defaultMiniAppConfiguration();
    configuration.rewards.enabled = true;
    expect(activationEligibility("rewards", configuration)).toEqual({ eligible: false, reason: "missing-dependency" });
    configuration.chores.enabled = true;
    expect(activationEligibility("rewards", configuration)).toEqual({ eligible: true });
  });
});
