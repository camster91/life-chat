export type RewardApiItem = Readonly<{ id: string; label: string }>;
export type RewardRequestApiItem = Readonly<{ id: string; rewardId: string; requesterMemberId: string; state: "requested" | "approved" | "rejected" }>;
export type RewardsApiResponse = Readonly<{ canManage: boolean; canApprove: boolean; rewards: readonly RewardApiItem[]; requests: readonly RewardRequestApiItem[] }>;
