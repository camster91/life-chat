import "server-only";
import type { NextRequest } from "next/server";
import { activeMemberCookieName } from "./account-context";
import { getAuth } from "./auth";
import { getDatabase } from "./database";
import { ActiveContextError, resolveActiveHouseholdContext, type ActiveHouseholdContext } from "./identity-context";

export class RequestContextError extends Error {
  constructor(message: string, readonly reason: "unauthenticated" | "no-membership" | "selection-required") {
    super(message);
  }
}

export async function loadSessionMemberships(request: NextRequest) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (session === null) return null;
  const now = new Date();
  const members = await getDatabase().member.findMany({
    where: {
      authenticatedSubjectId: session.user.id,
      lifecycle: "active",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: { household: { select: { name: true, timeZone: true, locale: true } } },
    orderBy: [{ household: { name: "asc" } }, { displayName: "asc" }],
  });
  return { session, members, now };
}

export async function resolveRequestContext(request: NextRequest): Promise<{
  context: ActiveHouseholdContext;
  member: NonNullable<Awaited<ReturnType<typeof loadSessionMemberships>>>["members"][number];
}> {
  const loaded = await loadSessionMemberships(request);
  if (loaded === null) throw new RequestContextError("Authentication is required.", "unauthenticated");
  if (loaded.members.length === 0) throw new RequestContextError("No active household membership is available.", "no-membership");
  const requestedMemberId = request.cookies.get(activeMemberCookieName)?.value;
  try {
    const context = resolveActiveHouseholdContext({
      authenticatedSubjectId: loaded.session.user.id,
      members: loaded.members.map((member) => ({ memberId: member.id, householdId: member.householdId, authenticatedSubjectId: member.authenticatedSubjectId, lifecycle: member.lifecycle, expiresAt: member.expiresAt })),
      ...(requestedMemberId === undefined ? {} : { requestedMemberId }),
      now: loaded.now,
    });
    return { context, member: loaded.members.find((member) => member.id === context.memberId)! };
  } catch (error) {
    if (error instanceof ActiveContextError) throw new RequestContextError("An explicit active household selection is required.", "selection-required");
    throw error;
  }
}
