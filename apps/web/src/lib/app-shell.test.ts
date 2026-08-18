import { describe, expect, it } from "vitest";
import { createShellNavigation } from "./app-shell";
import { defaultMiniAppConfiguration } from "./mini-app-registry";

describe("app shell navigation", () => {
  it("keeps core destinations available while marking Apps unavailable without enabled apps", () => {
    const navigation = createShellNavigation(defaultMiniAppConfiguration());

    expect(navigation.find((item) => item.route === "today")?.available).toBe(true);
    expect(navigation.find((item) => item.route === "apps")?.available).toBe(false);
  });

  it("exposes Apps only when an enabled mini-app passes dependency eligibility", () => {
    const configuration = defaultMiniAppConfiguration();
    configuration.chores.enabled = true;

    expect(createShellNavigation(configuration).find((item) => item.route === "apps")?.available).toBe(true);
  });
});
