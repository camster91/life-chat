import type { ActiveHouseholdContext, MemberLifecycle } from "./identity-context";
import { authorize, type BaselineRole, type CapabilityGrant } from "./permission-engine";

export type FamilyMemberSummary = Readonly<{
  memberId: string;
  householdId: string;
  displayName: string;
  role: BaselineRole;
  lifecycle: MemberLifecycle;
  authorized: true;
}>;

export type MembershipChangeProposal = Readonly<{
  targetMemberId: string;
  operation: "invite" | "suspend" | "remove" | "change-role";
  requiresConfirmation: true;
}>;

function assertSummary(summary: FamilyMemberSummary, context: ActiveHouseholdContext): void {
  if (summary.householdId !== context.householdId) throw new Error("Family member household must match active context");
  if (!summary.authorized) throw new Error("Family member summary must be authorized before display");
  if (summary.memberId.trim().length === 0 || summary.displayName.trim().length === 0 || summary.displayName.length > 120) throw new Error("Family member display data must be bounded");
}

export function createFamilyManagementState(input: {
  context: ActiveHouseholdContext;
  role: BaselineRole;
  grants: readonly CapabilityGrant[];
  now: Date;
  members: readonly FamilyMemberSummary[];
}): Readonly<{ canReadMembers: boolean; canManageMembers: boolean; members: readonly FamilyMemberSummary[] }> {
  const canRead = authorize({ context: input.context, role: input.role, grants: input.grants, now: input.now, request: { householdId: input.context.householdId, permission: "member.read" } }).allowed;
  const canManage = authorize({ context: input.context, role: input.role, grants: input.grants, now: input.now, request: { householdId: input.context.householdId, permission: "member.manage" } }).allowed;
  input.members.forEach((member) => assertSummary(member, input.context));
  return { canReadMembers: canRead, canManageMembers: canManage, members: canRead ? Object.freeze([...input.members]) : Object.freeze([]) };
}

/** Creates a review-only family change request; the future server command must reauthorize and audit execution. */
export function proposeMembershipChange(input: {
  state: ReturnType<typeof createFamilyManagementState>;
  targetMemberId: string;
  operation: MembershipChangeProposal["operation"];
}): MembershipChangeProposal {
  if (!input.state.canManageMembers) throw new Error("Only an authorized member may propose membership changes");
  if (input.targetMemberId.trim().length === 0 || input.targetMemberId.length > 200) throw new Error("Target member ID must be bounded");
  return { targetMemberId: input.targetMemberId, operation: input.operation, requiresConfirmation: true };
}
