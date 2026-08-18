import { describe, expect, it } from "vitest";
import { createAppsManagementState, proposeAppConfigurationChange } from "./apps-management";
import { defaultMiniAppConfiguration } from "./mini-app-registry";

const context = { authenticatedSubjectId: "subject_1", memberId: "member_1", householdId: "household_1" };
const state = (role: "adult" | "child" = "adult", configuration = defaultMiniAppConfiguration()) => createAppsManagementState({ context, role, grants: [], now: new Date("2026-08-18T12:00:00Z"), configuration });

describe("Apps management", () => {
  it("shows registry state and makes an adult change a confirmation-required proposal", () => {
    const view = state();
    expect(view.canConfigure).toBe(true);
    expect(proposeAppConfigurationChange({ state: view, appId: "chores", desiredEnabled: true })).toEqual({ appId: "chores", desiredEnabled: true, requiresConfirmation: true });
  });

  it("denies child configuration and blocks dependency-invalid changes", () => {
    expect(() => proposeAppConfigurationChange({ state: state("child"), appId: "chores", desiredEnabled: true })).toThrow("authorized");
    expect(() => proposeAppConfigurationChange({ state: state(), appId: "rewards", desiredEnabled: true })).toThrow("dependencies");
  });

  it("blocks a disable proposal while an enabled dependent remains", () => {
    const configuration = defaultMiniAppConfiguration();
    configuration.chores.enabled = true;
    configuration.rewards.enabled = true;
    expect(() => proposeAppConfigurationChange({ state: state("adult", configuration), appId: "chores", desiredEnabled: false })).toThrow("dependent");
  });
});
