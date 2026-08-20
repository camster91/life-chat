import { NextRequest, NextResponse } from "next/server";
import { readAuthEnvironment } from "@/lib/auth-environment";
import { getDatabase } from "@/lib/database";
import { completeHabitRoutine, HabitCommandError, HabitConflictError } from "@/lib/habit-repository";
import { RequestContextError, resolveRequestContext } from "@/lib/server-request-context";

export const dynamic = "force-dynamic";

function json(body: { error: string } | { id: string; completionDate: string }, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest, route: { params: Promise<{ routineId: string }> }) {
  if (request.headers.get("origin") !== readAuthEnvironment().trustedOrigin) return json({ error: "The request origin is not allowed." }, 403);
  try {
    const { routineId } = await route.params;
    if (routineId.trim().length === 0 || routineId.length > 200) return json({ error: "The habit was not found." }, 404);
    const resolved = await resolveRequestContext(request);
    const body: unknown = await request.json().catch(() => null);
    const commandId = typeof body === "object" && body !== null && "commandId" in body && typeof body.commandId === "string" ? body.commandId : "";
    const completion = await completeHabitRoutine(getDatabase(), { actor: { context: resolved.context, grants: [] }, routineId, commandId, now: new Date() });
    return json({ id: completion.id, completionDate: completion.completionDate });
  } catch (error) {
    if (error instanceof RequestContextError) return json({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409);
    if (error instanceof HabitConflictError) return json({ error: "This habit is already complete for today. Reload to review your progress." }, 409);
    if (error instanceof HabitCommandError) return json({ error: "The habit could not be completed." }, 403);
    throw error;
  }
}
