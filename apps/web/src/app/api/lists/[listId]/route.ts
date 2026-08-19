import { NextRequest, NextResponse } from "next/server";
import { readAuthEnvironment } from "@/lib/auth-environment";
import { getDatabase } from "@/lib/database";
import { authorize } from "@/lib/permission-engine";
import type { SharedListApiResponse } from "@/lib/shared-list-api";
import { addSharedListItem, loadSharedList, SharedListCommandError } from "@/lib/shared-list-repository";
import { RequestContextError, resolveRequestContext } from "@/lib/server-request-context";

export const dynamic = "force-dynamic";

function json(body: SharedListApiResponse | { error: string } | { id: string; label: string; position: number; state: "open" | "completed" }, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function validId(value: string): boolean {
  return value.trim().length > 0 && value.length <= 200;
}

export async function GET(request: NextRequest, route: { params: Promise<{ listId: string }> }) {
  try {
    const { listId } = await route.params;
    if (!validId(listId)) return json({ error: "The list was not found." }, 404);
    const resolved = await resolveRequestContext(request);
    const now = new Date();
    const list = await loadSharedList(getDatabase(), { actor: { context: resolved.context, grants: [] }, listId, now });
    const canManage = authorize({ context: resolved.context, role: resolved.member.role, grants: [], request: { householdId: resolved.context.householdId, permission: "lists.manage", appId: "shared-lists" }, now }).allowed;
    return json({
      id: list.id,
      title: list.title,
      version: list.version,
      canManage,
      items: list.items.map((item) => ({ id: item.id, label: item.label, position: item.position, state: item.state, assignedToActiveMember: item.assignedMemberId === resolved.context.memberId })),
    });
  } catch (error) {
    if (error instanceof RequestContextError) return json({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409);
    if (error instanceof SharedListCommandError) return json({ error: "The list was not found or is not available." }, 404);
    throw error;
  }
}

export async function POST(request: NextRequest, route: { params: Promise<{ listId: string }> }) {
  if (request.headers.get("origin") !== readAuthEnvironment().trustedOrigin) return json({ error: "The request origin is not allowed." }, 403);
  try {
    const { listId } = await route.params;
    if (!validId(listId)) return json({ error: "The list was not found." }, 404);
    const resolved = await resolveRequestContext(request);
    const body: unknown = await request.json().catch(() => null);
    const label = typeof body === "object" && body !== null && "label" in body && typeof body.label === "string" ? body.label : "";
    const commandId = typeof body === "object" && body !== null && "commandId" in body && typeof body.commandId === "string" ? body.commandId : "";
    const item = await addSharedListItem(getDatabase(), { actor: { context: resolved.context, grants: [] }, listId, label, commandId, now: new Date() });
    return json({ id: item.id, label: item.label, position: item.position, state: item.state }, 201);
  } catch (error) {
    if (error instanceof RequestContextError) return json({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409);
    if (error instanceof SharedListCommandError) return json({ error: "The item could not be added." }, 403);
    throw error;
  }
}
