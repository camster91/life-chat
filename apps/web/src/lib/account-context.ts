export const activeMemberCookieName = "life_chat_active_member";

export type AccountContextOption = Readonly<{
  memberId: string;
  householdName: string;
  displayName: string;
}>;

export type AccountContextResponse =
  | Readonly<{ status: "no-membership" }>
  | Readonly<{ status: "selection-required"; options: readonly AccountContextOption[] }>
  | Readonly<{ status: "active"; memberId: string; householdName: string; displayName: string }>;
