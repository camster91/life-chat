import { NextRequest, NextResponse } from "next/server";
import { readAuthEnvironment } from "@/lib/auth-environment";
import { getDatabase } from "@/lib/database";
import type { HabitsApiResponse } from "@/lib/habits-api";
import { createHabitRoutine, HabitCommandError, loadPersistedHabitProgress } from "@/lib/habit-repository";
import { RequestContextError, resolveRequestContext } from "@/lib/server-request-context";

export const dynamic = "force-dynamic";

function json(body: HabitsApiResponse | { error: string } | { id: string; label: string }, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveRequestContext(request);
    const habits = await loadPersistedHabitProgress(getDatabase(), { actor: { context: resolved.context, grants: [] }, now: new Date() });
    return json({ householdName: resolved.member.household.name, today: habits.today, canManage: habits.canManage, habits: habits.progress });
  } catch (error) {
    if (error instanceof RequestContextError) return json({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409);
    if (error instanceof HabitCommandError) return json({ error: "Habits is not available for this household member." }, 403);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== readAuthEnvironment().trustedOrigin) return json({ error: "The request origin is not allowed." }, 403);
  try {
    const resolved = await resolveRequestContext(request);
    const body: unknown = await request.json().catch(() => null);
    const label = typeof body === "object" && body !== null && "label" in body && typeof body.label === "string" ? body.label : "";
    const commandId = typeof body === "object" && body !== null && "commandId" in body && typeof body.commandId === "string" ? body.commandId : "";
    const habit = await createHabitRoutine(getDatabase(), { actor: { context: resolved.context, grants: [] }, label, commandId, now: new Date() });
    return json({ id: habit.id, label: habit.label }, 201);
  } catch (error) {
    if (error instanceof RequestContextError) return json({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409);
    if (error instanceof HabitCommandError) return json({ error: "The habit could not be created." }, 403);
    throw error;
  }
}
