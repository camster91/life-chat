import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import type { SearchApiResponse } from "@/lib/search-api";
import { SearchAccessError, searchAuthorizedRecords } from "@/lib/global-search-repository";
import { RequestContextError, resolveRequestContext } from "@/lib/server-request-context";

export const dynamic = "force-dynamic";

function json(body: SearchApiResponse | { error: string }, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q") ?? "";
    const resolved = await resolveRequestContext(request);
    const groups = await searchAuthorizedRecords(getDatabase(), { context: resolved.context, grants: [], query, now: new Date() });
    return json({ query: query.trim(), groups });
  } catch (error) {
    if (error instanceof RequestContextError) return json({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409);
    if (error instanceof SearchAccessError) return json({ error: error.message }, 403);
    throw error;
  }
}
