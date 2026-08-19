import type { BaselineRole } from "./permission-engine";
import type { MemberLifecycle } from "./identity-context";

export type FamilyApiMember = Readonly<{
  memberId: string;
  displayName: string;
  role: BaselineRole;
  lifecycle: MemberLifecycle;
  expiresAt: string | null;
  hasAccount: boolean;
  isCurrent: boolean;
}>;

export type FamilyApiResponse = Readonly<{
  householdName: string;
  canReadMembers: boolean;
  canManageMembers: boolean;
  members: readonly FamilyApiMember[];
}>;
