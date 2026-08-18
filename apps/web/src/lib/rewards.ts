import type { ActiveHouseholdContext } from "./identity-context";
import { activationEligibility, type HouseholdMiniAppConfiguration } from "./mini-app-registry";
import { authorize, type BaselineRole, type CapabilityGrant } from "./permission-engine";

export type RewardSummary = Readonly<{ id: string; householdId: string; label: string; authorized: true }>;

export function createRewardCatalogue(input: { context: ActiveHouseholdContext; configuration: HouseholdMiniAppConfiguration; rewards: readonly RewardSummary[] }): readonly RewardSummary[] {
  if (!activationEligibility("rewards", input.configuration).eligible) throw new Error("Rewards mini-app must be enabled and eligible");
  return Object.freeze(input.rewards.map((reward) => {
    if (reward.householdId !== input.context.householdId || !reward.authorized) throw new Error("Reward must match active household and be authorized");
    if (reward.id.trim().length === 0 || reward.label.trim().length === 0 || reward.label.length > 200) throw new Error("Reward display data must be bounded");
    return Object.freeze({ ...reward });
  }));
}

/** A redemption request is not a balance deduction, approval, allowance payment, or fulfillment. */
export function proposeRewardRedemption(input: { context: ActiveHouseholdContext; configuration: HouseholdMiniAppConfiguration; reward: RewardSummary }): Readonly<{ rewardId: string; requestingMemberId: string; requiresAdultApproval: true }> {
  createRewardCatalogue({ context: input.context, configuration: input.configuration, rewards: [input.reward] });
  return Object.freeze({ rewardId: input.reward.id, requestingMemberId: input.context.memberId, requiresAdultApproval: true });
}

export function canApproveRewardRedemption(input: { context: ActiveHouseholdContext; role: BaselineRole; grants: readonly CapabilityGrant[]; now: Date }): boolean {
  return authorize({ context: input.context, role: input.role, grants: input.grants, now: input.now, request: { householdId: input.context.householdId, permission: "rewards.approve" } }).allowed;
}
