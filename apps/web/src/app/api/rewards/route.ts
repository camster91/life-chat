import { NextRequest, NextResponse } from "next/server";
import { readAuthEnvironment } from "@/lib/auth-environment";
import { getDatabase } from "@/lib/database";
import type { RewardsApiResponse } from "@/lib/rewards-api";
import { createReward, loadRewardWorkspace, RewardCommandError } from "@/lib/reward-repository";
import { RequestContextError, resolveRequestContext } from "@/lib/server-request-context";

export const dynamic = "force-dynamic";
function json(body: RewardsApiResponse | { error: string } | { id: string; label: string }, status = 200) { return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } }); }

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveRequestContext(request);
    const workspace = await loadRewardWorkspace(getDatabase(), { actor: { context: resolved.context, grants: [] }, now: new Date() });
    return json({ canManage: workspace.canManage, canApprove: workspace.canApprove, rewards: workspace.rewards.map((reward) => ({ id: reward.id, label: reward.label })), requests: workspace.requests.map((item) => ({ id: item.id, rewardId: item.rewardId, requesterMemberId: item.requesterMemberId, state: item.state })) });
  } catch (error) { if (error instanceof RequestContextError) return json({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409); if (error instanceof RewardCommandError) return json({ error: "Rewards is not available for this household member." }, 403); throw error; }
}
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== readAuthEnvironment().trustedOrigin) return json({ error: "The request origin is not allowed." }, 403);
  try {
    const resolved = await resolveRequestContext(request); const body: unknown = await request.json().catch(() => null);
    const label = typeof body === "object" && body !== null && "label" in body && typeof body.label === "string" ? body.label : "";
    const commandId = typeof body === "object" && body !== null && "commandId" in body && typeof body.commandId === "string" ? body.commandId : "";
    const reward = await createReward(getDatabase(), { actor: { context: resolved.context, grants: [] }, label, commandId, now: new Date() });
    return json({ id: reward.id, label: reward.label }, 201);
  } catch (error) { if (error instanceof RequestContextError) return json({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409); if (error instanceof RewardCommandError) return json({ error: "The reward could not be created." }, 403); throw error; }
}
