import { NextRequest, NextResponse } from "next/server";
import { readAuthEnvironment } from "@/lib/auth-environment";
import { getDatabase } from "@/lib/database";
import { requestReward, RewardCommandError } from "@/lib/reward-repository";
import { RequestContextError, resolveRequestContext } from "@/lib/server-request-context";
export const dynamic = "force-dynamic";
function json(body: { error: string } | { id: string; state: "requested" | "approved" | "rejected" }, status = 200) { return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } }); }
export async function POST(request: NextRequest, route: { params: Promise<{ rewardId: string }> }) {
  if (request.headers.get("origin") !== readAuthEnvironment().trustedOrigin) return json({ error: "The request origin is not allowed." }, 403);
  try {
    const { rewardId } = await route.params; if (rewardId.trim().length === 0 || rewardId.length > 200) return json({ error: "The reward was not found." }, 404);
    const resolved = await resolveRequestContext(request); const body: unknown = await request.json().catch(() => null); const commandId = typeof body === "object" && body !== null && "commandId" in body && typeof body.commandId === "string" ? body.commandId : "";
    const result = await requestReward(getDatabase(), { actor: { context: resolved.context, grants: [] }, rewardId, commandId, now: new Date() }); return json({ id: result.id, state: result.state }, 201);
  } catch (error) { if (error instanceof RequestContextError) return json({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409); if (error instanceof RewardCommandError) return json({ error: "The reward could not be requested." }, 403); throw error; }
}
