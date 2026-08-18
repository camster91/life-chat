import { describe, expect, it } from "vitest";
import { canApproveRewardRedemption, createRewardCatalogue, proposeRewardRedemption, type RewardSummary } from "./rewards";
import { defaultMiniAppConfiguration } from "./mini-app-registry";

const context = { authenticatedSubjectId: "subject_1", memberId: "member_1", householdId: "household_1" };
const configuration = defaultMiniAppConfiguration(); configuration.chores.enabled = true; configuration.rewards.enabled = true;
const reward: RewardSummary = { id: "reward_1", householdId: "household_1", label: "Choose the family movie", authorized: true };

describe("Rewards", () => {
  it("shows an eligible non-financial catalogue and makes an adult-approved request", () => {
    expect(createRewardCatalogue({ context, configuration, rewards: [reward] })).toEqual([reward]);
    expect(proposeRewardRedemption({ context, configuration, reward })).toEqual({ rewardId: "reward_1", requestingMemberId: "member_1", requiresAdultApproval: true });
  });
  it("requires dependencies and keeps approval adult-only", () => {
    expect(() => createRewardCatalogue({ context, configuration: defaultMiniAppConfiguration(), rewards: [reward] })).toThrow("enabled and eligible");
    expect(canApproveRewardRedemption({ context, role: "adult", grants: [], now: new Date() })).toBe(true);
    expect(canApproveRewardRedemption({ context, role: "child", grants: [], now: new Date() })).toBe(false);
  });
  it("rejects cross-household or unsafe catalogue entries", () => {
    expect(() => createRewardCatalogue({ context, configuration, rewards: [{ ...reward, householdId: "household_2" }] })).toThrow("active household");
    expect(() => createRewardCatalogue({ context, configuration, rewards: [{ ...reward, label: "" }] })).toThrow("bounded");
  });
});
