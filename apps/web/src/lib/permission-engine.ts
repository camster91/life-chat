import type { ActiveHouseholdContext } from "./identity-context";

export const permissions = [
  "household.read",
  "household.manage",
  "member.read",
  "member.invite",
  "member.manage",
  "mini-app.configure",
  "audit.read",
  "data.export",
  "privacy.manage",
  "notification.manage-self",
  "profile.read-self",
  "profile.update-self",
  "ai.propose",
  "ai.confirm",
  "ai.configure",
  "rewards.approve",
  "messages.participate",
  "budget.view",
  "lists.manage",
  "chores.complete-assigned",
] as const;

export type Permission = (typeof permissions)[number];
export type BaselineRole = "adult" | "child" | "guest";

export type CapabilityGrant = {
  grantId: string;
  memberId: string;
  householdId: string;
  permission: Permission;
  appId: string | null;
  resourceId: string | null;
  expiresAt: Date | null;
};

export type AuthorizationRequest = {
  householdId: string;
  permission: Permission;
  appId?: string;
  resourceId?: string;
};

export type AuthorizationDecision = { allowed: true; source: "baseline" | "grant" } | { allowed: false; reason: "household-mismatch" | "missing-permission" };

const baselinePermissions: Record<BaselineRole, readonly Permission[]> = {
  adult: ["household.read", "household.manage", "member.read", "member.invite", "member.manage", "mini-app.configure", "audit.read", "data.export", "privacy.manage", "profile.read-self", "profile.update-self", "notification.manage-self", "ai.propose", "ai.confirm", "ai.configure", "rewards.approve", "messages.participate", "budget.view", "lists.manage"],
  child: ["household.read", "profile.read-self", "profile.update-self", "notification.manage-self", "ai.propose", "messages.participate", "chores.complete-assigned"],
  guest: [],
};

function grantMatches(grant: CapabilityGrant, context: ActiveHouseholdContext, request: AuthorizationRequest, now: Date): boolean {
  return grant.memberId === context.memberId
    && grant.householdId === context.householdId
    && grant.permission === request.permission
    && (grant.expiresAt === null || grant.expiresAt > now)
    && (grant.appId === null ? request.appId === undefined : grant.appId === request.appId)
    && (grant.resourceId === null ? request.resourceId === undefined : grant.resourceId === request.resourceId);
}

export function authorize(input: {
  context: ActiveHouseholdContext;
  role: BaselineRole;
  grants: readonly CapabilityGrant[];
  request: AuthorizationRequest;
  now: Date;
}): AuthorizationDecision {
  if (input.context.householdId !== input.request.householdId) {
    return { allowed: false, reason: "household-mismatch" };
  }

  if (baselinePermissions[input.role].includes(input.request.permission)) {
    return { allowed: true, source: "baseline" };
  }

  if (input.grants.some((grant) => grantMatches(grant, input.context, input.request, input.now))) {
    return { allowed: true, source: "grant" };
  }

  return { allowed: false, reason: "missing-permission" };
}
