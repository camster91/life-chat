import { NextRequest, NextResponse } from "next/server";
import { activeMemberCookieName, type AccountContextResponse } from "@/lib/account-context";
import { getAuth } from "@/lib/auth";
import { readAuthEnvironment } from "@/lib/auth-environment";
import { getDatabase } from "@/lib/database";
import { ActiveContextError, resolveActiveHouseholdContext } from "@/lib/identity-context";

export const dynamic = "force-dynamic";

function json(body: AccountContextResponse | { error: string }, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function setActiveMemberCookie(response: NextResponse, memberId: string) {
  const environment = readAuthEnvironment();
  response.cookies.set(activeMemberCookieName, memberId, {
    httpOnly: true,
    sameSite: "strict",
    secure: environment.betterAuthUrl.startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

async function loadSessionMemberships(request: NextRequest) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (session === null) return null;
  const now = new Date();
  const members = await getDatabase().member.findMany({
    where: {
      authenticatedSubjectId: session.user.id,
      lifecycle: "active",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: { household: { select: { name: true } } },
    orderBy: [{ household: { name: "asc" } }, { displayName: "asc" }],
  });
  return { session, members, now };
}

function activeResponse(member: { id: string; displayName: string; household: { name: string } }): AccountContextResponse {
  return { status: "active", memberId: member.id, householdName: member.household.name, displayName: member.displayName };
}

export async function GET(request: NextRequest) {
  const loaded = await loadSessionMemberships(request);
  if (loaded === null) return json({ error: "Authentication is required." }, 401);
  if (loaded.members.length === 0) return json({ status: "no-membership" });

  const requestedMemberId = request.cookies.get(activeMemberCookieName)?.value;
  if (requestedMemberId !== undefined) {
    try {
      const context = resolveActiveHouseholdContext({
        authenticatedSubjectId: loaded.session.user.id,
        members: loaded.members.map((member) => ({ memberId: member.id, householdId: member.householdId, authenticatedSubjectId: member.authenticatedSubjectId, lifecycle: member.lifecycle, expiresAt: member.expiresAt })),
        requestedMemberId,
        now: loaded.now,
      });
      return json(activeResponse(loaded.members.find((member) => member.id === context.memberId)!));
    } catch (error) {
      if (!(error instanceof ActiveContextError)) throw error;
    }
  }

  if (loaded.members.length === 1) {
    const response = json(activeResponse(loaded.members[0]));
    setActiveMemberCookie(response, loaded.members[0].id);
    return response;
  }
  const response = json({ status: "selection-required", options: loaded.members.map((member) => ({ memberId: member.id, householdName: member.household.name, displayName: member.displayName })) });
  if (requestedMemberId !== undefined) response.cookies.delete(activeMemberCookieName);
  return response;
}

export async function POST(request: NextRequest) {
  const environment = readAuthEnvironment();
  if (request.headers.get("origin") !== environment.trustedOrigin) return json({ error: "The request origin is not allowed." }, 403);
  const loaded = await loadSessionMemberships(request);
  if (loaded === null) return json({ error: "Authentication is required." }, 401);
  const body: unknown = await request.json().catch(() => null);
  const memberId = typeof body === "object" && body !== null && "memberId" in body && typeof body.memberId === "string" ? body.memberId : "";
  if (memberId.trim().length === 0 || memberId.length > 200) return json({ error: "A valid member selection is required." }, 400);
  try {
    const context = resolveActiveHouseholdContext({
      authenticatedSubjectId: loaded.session.user.id,
      members: loaded.members.map((member) => ({ memberId: member.id, householdId: member.householdId, authenticatedSubjectId: member.authenticatedSubjectId, lifecycle: member.lifecycle, expiresAt: member.expiresAt })),
      requestedMemberId: memberId,
      now: loaded.now,
    });
    const member = loaded.members.find((candidate) => candidate.id === context.memberId)!;
    const response = json(activeResponse(member));
    setActiveMemberCookie(response, member.id);
    return response;
  } catch (error) {
    if (error instanceof ActiveContextError) return json({ error: "The selected member is not available." }, 403);
    throw error;
  }
}
