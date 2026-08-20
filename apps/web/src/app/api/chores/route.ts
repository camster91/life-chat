import { NextRequest, NextResponse } from "next/server";
import { readAuthEnvironment } from "@/lib/auth-environment";
import { ChoreCompletionError, createPersistedChoreAssignment, loadPersistedChoreAssignments } from "@/lib/chore-repository";
import type { ChoreWorkspaceApiResponse } from "@/lib/chores-api";
import { parseDateOnly } from "@/lib/date-time";
import { getDatabase } from "@/lib/database";
import { RequestContextError, resolveRequestContext } from "@/lib/server-request-context";

export const dynamic = "force-dynamic";

function json(body: ChoreWorkspaceApiResponse | { error: string } | { id: string }, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveRequestContext(request);
    const workspace = await loadPersistedChoreAssignments(getDatabase(), { actor: { context: resolved.context, grants: [] }, now: new Date() });
    return json({
      householdName: resolved.member.household.name,
      canManage: workspace.canManage,
      members: workspace.activeMembers.map((member) => ({ id: member.id, displayName: member.displayName, role: member.role as "adult" | "child" })),
      assignments: workspace.assignments.map((assignment) => ({ id: assignment.id, title: assignment.title, dueDate: assignment.dueDate, state: assignment.state, assigneeName: workspace.canManage ? workspace.assigneeNames.get(assignment.assigneeMemberId) ?? null : null, deepLink: `/chores/assignments/${encodeURIComponent(assignment.id)}` })),
    });
  } catch (error) {
    if (error instanceof RequestContextError) return json({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409);
    if (error instanceof ChoreCompletionError) return json({ error: "Chores are not available for this household member." }, 403);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== readAuthEnvironment().trustedOrigin) return json({ error: "The request origin is not allowed." }, 403);
  try {
    const body: unknown = await request.json().catch(() => null);
    const title = typeof body === "object" && body !== null && "title" in body && typeof body.title === "string" ? body.title : "";
    const assigneeMemberId = typeof body === "object" && body !== null && "assigneeMemberId" in body && typeof body.assigneeMemberId === "string" ? body.assigneeMemberId : "";
    const commandId = typeof body === "object" && body !== null && "commandId" in body && typeof body.commandId === "string" ? body.commandId : "";
    const rawDueDate = typeof body === "object" && body !== null && "dueDate" in body ? body.dueDate : null;
    if (rawDueDate !== null && typeof rawDueDate !== "string") return json({ error: "Choose a valid due date." }, 400);
    const dueDate = (() => {
      if (rawDueDate === null || rawDueDate === "") return null;
      parseDateOnly(rawDueDate);
      return rawDueDate;
    })();
    const resolved = await resolveRequestContext(request);
    const assignment = await createPersistedChoreAssignment(getDatabase(), { actor: { context: resolved.context, grants: [] }, title, assigneeMemberId, dueDate, commandId, now: new Date() });
    return json({ id: assignment.id }, 201);
  } catch (error) {
    if (error instanceof RequestContextError) return json({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409);
    if (error instanceof ChoreCompletionError || error instanceof RangeError) return json({ error: "The chore could not be assigned. Check the details and your access." }, 403);
    throw error;
  }
}
