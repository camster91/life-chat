import { NextRequest, NextResponse } from "next/server";
import type { SettingsApiResponse } from "@/lib/settings-api";
import { createSettingsCatalogue } from "@/lib/settings-catalogue";
import { RequestContextError, resolveRequestContext } from "@/lib/server-request-context";

export const dynamic = "force-dynamic";

function json(body: SettingsApiResponse | { error: string }, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveRequestContext(request);
    return json({
      householdName: resolved.member.household.name,
      displayName: resolved.member.displayName,
      sections: createSettingsCatalogue({ context: resolved.context, role: resolved.member.role, grants: [], now: new Date() }),
    });
  } catch (error) {
    if (error instanceof RequestContextError) return json({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409);
    throw error;
  }
}
