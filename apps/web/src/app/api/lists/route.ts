import { NextRequest, NextResponse } from "next/server";
import { readAuthEnvironment } from "@/lib/auth-environment";
import { getDatabase } from "@/lib/database";
import { authorize } from "@/lib/permission-engine";
import type { SharedListsApiResponse } from "@/lib/shared-list-api";
import { createSharedList, loadSharedLists, SharedListCommandError } from "@/lib/shared-list-repository";
import { RequestContextError, resolveRequestContext } from "@/lib/server-request-context";

export const dynamic = "force-dynamic";

function json(body: SharedListsApiResponse | { error: string } | { id: string; title: string; version: number }, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function canManage(resolved: Awaited<ReturnType<typeof resolveRequestContext>>, now: Date): boolean {
  return authorize({ context: resolved.context, role: resolved.member.role, grants: [], request: { householdId: resolved.context.householdId, permission: "lists.manage", appId: "shared-lists" }, now }).allowed;
}

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveRequestContext(request);
    const now = new Date();
    const lists = await loadSharedLists(getDatabase(), { actor: { context: resolved.context, grants: [] }, now });
    return json({
      householdName: resolved.member.household.name,
      canManage: canManage(resolved, now),
      lists: lists.map((list) => ({ id: list.id, title: list.title, version: list.version, openItemCount: list._count.items, updatedAt: list.updatedAt.toISOString() })),
    });
  } catch (error) {
    if (error instanceof RequestContextError) return json({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409);
    if (error instanceof SharedListCommandError) return json({ error: "Shared Lists is not available for this household member." }, 403);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== readAuthEnvironment().trustedOrigin) return json({ error: "The request origin is not allowed." }, 403);
  try {
    const resolved = await resolveRequestContext(request);
    const body: unknown = await request.json().catch(() => null);
    const title = typeof body === "object" && body !== null && "title" in body && typeof body.title === "string" ? body.title : "";
    const commandId = typeof body === "object" && body !== null && "commandId" in body && typeof body.commandId === "string" ? body.commandId : "";
    const list = await createSharedList(getDatabase(), { actor: { context: resolved.context, grants: [] }, title, commandId, now: new Date() });
    return json({ id: list.id, title: list.title, version: list.version }, 201);
  } catch (error) {
    if (error instanceof RequestContextError) return json({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409);
    if (error instanceof SharedListCommandError) return json({ error: "The list could not be created." }, 403);
    throw error;
  }
}
