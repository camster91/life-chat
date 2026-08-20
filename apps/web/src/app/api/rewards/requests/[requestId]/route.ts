import { NextRequest, NextResponse } from "next/server";
import { readAuthEnvironment } from "@/lib/auth-environment";
import { decideRewardRequest, RewardCommandError, RewardConflictError } from "@/lib/reward-repository";
import { getDatabase } from "@/lib/database";
import { RequestContextError, resolveRequestContext } from "@/lib/server-request-context";
export const dynamic = "force-dynamic";
function json(body: { error: string } | { id: string; state: "approved" | "rejected" }, status = 200) { return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } }); }
export async function PATCH(request: NextRequest, route: { params: Promise<{ requestId: string }> }) {
  if (request.headers.get("origin") !== readAuthEnvironment().trustedOrigin) return json({ error: "The request origin is not allowed." }, 403);
  try {
    const { requestId } = await route.params; if (requestId.trim().length === 0 || requestId.length > 200) return json({ error: "The reward request was not found." }, 404);
    const resolved = await resolveRequestContext(request); const body: unknown = await request.json().catch(() => null);
    const state = typeof body === "object" && body !== null && "state" in body && (body.state === "approved" || body.state === "rejected") ? body.state : null;
    const commandId = typeof body === "object" && body !== null && "commandId" in body && typeof body.commandId === "string" ? body.commandId : "";
    if (state === null) return json({ error: "Choose approve or reject." }, 400);
    const result = await decideRewardRequest(getDatabase(), { actor: { context: resolved.context, grants: [] }, requestId, state, commandId, now: new Date() }); return json({ id: result.id, state: result.state as "approved" | "rejected" });
  } catch (error) { if (error instanceof RequestContextError) return json({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409); if (error instanceof RewardConflictError) return json({ error: "The reward request changed. Reload before deciding." }, 409); if (error instanceof RewardCommandError) return json({ error: "The reward request could not be decided." }, 403); throw error; }
}
