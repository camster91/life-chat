export type MemberLifecycle = "active" | "invited" | "suspended" | "removed";

export type HouseholdMemberAccess = {
  memberId: string;
  householdId: string;
  authenticatedSubjectId: string | null;
  lifecycle: MemberLifecycle;
  expiresAt: Date | null;
};

export type ActiveHouseholdContext = {
  authenticatedSubjectId: string;
  memberId: string;
  householdId: string;
};

export class ActiveContextError extends Error {}

export function resolveActiveHouseholdContext(input: {
  authenticatedSubjectId: string;
  members: readonly HouseholdMemberAccess[];
  requestedMemberId?: string;
  now: Date;
}): ActiveHouseholdContext {
  const eligible = input.members.filter((member) =>
    member.authenticatedSubjectId === input.authenticatedSubjectId
    && member.lifecycle === "active"
    && (member.expiresAt === null || member.expiresAt > input.now),
  );

  const member = input.requestedMemberId === undefined
    ? eligible.length === 1 ? eligible[0] : undefined
    : eligible.find((candidate) => candidate.memberId === input.requestedMemberId);

  if (member === undefined) {
    throw new ActiveContextError("No active household member is available for this authenticated subject.");
  }

  return {
    authenticatedSubjectId: input.authenticatedSubjectId,
    memberId: member.memberId,
    householdId: member.householdId,
  };
}
