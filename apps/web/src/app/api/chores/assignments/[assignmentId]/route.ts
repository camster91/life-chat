import { NextRequest, NextResponse } from "next/server";
import { readAuthEnvironment } from "@/lib/auth-environment";
import type { ChoreAssignmentApiResponse } from "@/lib/chore-assignment-api";
import { ChoreCompletionError, completePersistedAssignedChore } from "@/lib/chore-repository";
import { getDatabase } from "@/lib/database";
import { loadHouseholdMiniAppConfiguration } from "@/lib/identity-repository";
import { activationEligibility } from "@/lib/mini-app-registry";
import { authorize } from "@/lib/permission-engine";
import { RequestContextError, resolveRequestContext } from "@/lib/server-request-context";

export const dynamic = "force-dynamic";

function noStore(body: ChoreAssignmentApiResponse | { error: string }, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function validAssignmentId(value: string): boolean {
  return value.trim().length > 0 && value.length <= 200;
}

export async function GET(request: NextRequest, route: { params: Promise<{ assignmentId: string }> }) {
  try {
    const { assignmentId } = await route.params;
    if (!validAssignmentId(assignmentId)) return noStore({ error: "The assignment was not found." }, 404);
    const resolved = await resolveRequestContext(request);
    const assignment = await getDatabase().choreAssignment.findFirst({ where: {
      id: assignmentId,
      householdId: resolved.context.householdId,
    } });
    if (assignment === null) return noStore({ error: "The assignment was not found." }, 404);
    const now = new Date();
    const canComplete = assignment.assigneeMemberId === resolved.context.memberId && authorize({
      context: resolved.context,
      role: resolved.member.role,
      grants: [],
      request: { householdId: resolved.context.householdId, permission: "chores.complete-assigned" },
      now,
    }).allowed;
    const canManage = authorize({ context: resolved.context, role: resolved.member.role, grants: [], request: { householdId: resolved.context.householdId, permission: "chores.manage", appId: "chores" }, now }).allowed;
    const configuration = await loadHouseholdMiniAppConfiguration(getDatabase(), resolved.context.householdId);
    if (!activationEligibility("chores", configuration).eligible || (!canComplete && !canManage)) return noStore({ error: "The assignment was not found." }, 404);
    return noStore({
      id: assignment.id,
      title: assignment.title,
      dueDate: assignment.dueDate,
      state: assignment.state,
      completedAt: assignment.completedAt?.toISOString() ?? null,
      canComplete,
    });
  } catch (error) {
    if (error instanceof RequestContextError) return noStore({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409);
    throw error;
  }
}

export async function POST(request: NextRequest, route: { params: Promise<{ assignmentId: string }> }) {
  const environment = readAuthEnvironment();
  if (request.headers.get("origin") !== environment.trustedOrigin) return noStore({ error: "The request origin is not allowed." }, 403);
  try {
    const { assignmentId } = await route.params;
    if (!validAssignmentId(assignmentId)) return noStore({ error: "The assignment was not found." }, 404);
    const resolved = await resolveRequestContext(request);
    const body: unknown = await request.json().catch(() => null);
    const commandId = typeof body === "object" && body !== null && "commandId" in body && typeof body.commandId === "string" ? body.commandId : "";
    const completed = await completePersistedAssignedChore(getDatabase(), {
      context: resolved.context,
      grants: [],
      assignmentId,
      commandId,
      now: new Date(),
    });
    return noStore({
      id: completed.id,
      title: completed.title,
      dueDate: completed.dueDate,
      state: completed.state,
      completedAt: completed.completedAt?.toISOString() ?? null,
      canComplete: false,
    });
  } catch (error) {
    if (error instanceof RequestContextError) return noStore({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409);
    if (error instanceof ChoreCompletionError) return noStore({ error: "The assignment could not be completed." }, 403);
    throw error;
  }
}
