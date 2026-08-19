import { NextRequest, NextResponse } from "next/server";
import { readAuthEnvironment } from "@/lib/auth-environment";
import { getDatabase } from "@/lib/database";
import { changeMemberLifecycle, MemberLifecycleError } from "@/lib/identity-repository";
import { RequestContextError, resolveRequestContext } from "@/lib/server-request-context";

export async function POST(request: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  if (request.headers.get("origin") !== readAuthEnvironment().trustedOrigin) return NextResponse.json({ error: "The request origin is not allowed." }, { status: 403 });
  try {
    const resolved = await resolveRequestContext(request);
    const body: unknown = await request.json().catch(() => null);
    if (typeof body !== "object" || body === null) return NextResponse.json({ error: "A confirmed lifecycle action is required." }, { status: 400 });
    const lifecycle = "lifecycle" in body && (body.lifecycle === "suspended" || body.lifecycle === "removed") ? body.lifecycle : null;
    const commandId = "commandId" in body && typeof body.commandId === "string" ? body.commandId : "";
    const confirmed = "confirmed" in body && body.confirmed === true;
    if (lifecycle === null || !confirmed) return NextResponse.json({ error: "A confirmed lifecycle action is required." }, { status: 400 });
    const { memberId } = await params;
    const member = await changeMemberLifecycle(getDatabase(), { actor: { context: resolved.context, role: resolved.member.role, grants: [] }, targetMemberId: memberId, lifecycle, commandId, now: new Date() });
    return NextResponse.json({ memberId: member.id, lifecycle: member.lifecycle }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestContextError) return NextResponse.json({ error: error.message }, { status: error.reason === "unauthenticated" ? 401 : 409 });
    if (error instanceof MemberLifecycleError) return NextResponse.json({ error: "The member change could not be completed. Check household access and last-adult safety." }, { status: 409 });
    throw error;
  }
}
