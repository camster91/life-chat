import { NextRequest, NextResponse } from "next/server";
import { readAuthEnvironment } from "@/lib/auth-environment";
import { getDatabase } from "@/lib/database";
import { reopenSharedListItem, SharedListCommandError, SharedListConflictError } from "@/lib/shared-list-repository";
import { RequestContextError, resolveRequestContext } from "@/lib/server-request-context";

export const dynamic = "force-dynamic";

function json(body: { error: string } | { id: string; state: "open" | "completed"; version: number }, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function validId(value: string): boolean {
  return value.trim().length > 0 && value.length <= 200;
}

export async function POST(request: NextRequest, route: { params: Promise<{ listId: string; itemId: string }> }) {
  if (request.headers.get("origin") !== readAuthEnvironment().trustedOrigin) return json({ error: "The request origin is not allowed." }, 403);
  try {
    const { listId, itemId } = await route.params;
    if (!validId(listId) || !validId(itemId)) return json({ error: "The item was not found." }, 404);
    const resolved = await resolveRequestContext(request);
    const body: unknown = await request.json().catch(() => null);
    const commandId = typeof body === "object" && body !== null && "commandId" in body && typeof body.commandId === "string" ? body.commandId : "";
    const expectedVersion = typeof body === "object" && body !== null && "expectedVersion" in body && typeof body.expectedVersion === "number" ? body.expectedVersion : 0;
    const item = await reopenSharedListItem(getDatabase(), { actor: { context: resolved.context, grants: [] }, listId, itemId, commandId, expectedVersion, now: new Date() });
    return json({ id: item.id, state: item.state, version: item.version });
  } catch (error) {
    if (error instanceof RequestContextError) return json({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409);
    if (error instanceof SharedListConflictError) return json({ error: "The item changed. Reload the list before trying again." }, 409);
    if (error instanceof SharedListCommandError) return json({ error: "The item could not be reopened." }, 403);
    throw error;
  }
}
