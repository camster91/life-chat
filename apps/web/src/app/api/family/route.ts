import { NextRequest, NextResponse } from "next/server";
import type { FamilyApiResponse } from "@/lib/family-api";
import { FamilyAccessError, loadFamilyDirectory } from "@/lib/family-repository";
import { getDatabase } from "@/lib/database";
import { RequestContextError, resolveRequestContext } from "@/lib/server-request-context";

export const dynamic = "force-dynamic";

function json(body: FamilyApiResponse | { error: string }, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveRequestContext(request);
    const result = await loadFamilyDirectory(getDatabase(), { actor: { context: resolved.context, grants: [] }, now: new Date() });
    return json({
      householdName: result.householdName,
      canReadMembers: result.state.canReadMembers,
      canManageMembers: result.state.canManageMembers,
      members: result.state.members.map(({ householdId: _householdId, authorized: _authorized, ...member }) => ({ ...member, isCurrent: member.memberId === resolved.context.memberId })),
    });
  } catch (error) {
    if (error instanceof RequestContextError) return json({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409);
    if (error instanceof FamilyAccessError) return json({ error: "Family is not available for this household member." }, 403);
    throw error;
  }
}
