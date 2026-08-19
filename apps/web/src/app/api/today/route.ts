import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import { dateOnlyAtInstant } from "@/lib/date-time";
import { RequestContextError, resolveRequestContext } from "@/lib/server-request-context";
import { loadTodayDashboard } from "@/lib/today-dashboard-repository";
import type { TodayApiResponse } from "@/lib/today-api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveRequestContext(request);
    const now = new Date();
    const date = dateOnlyAtInstant({ instant: now.toISOString(), timeZone: resolved.member.household.timeZone });
    const dashboard = await loadTodayDashboard(getDatabase(), {
      context: resolved.context,
      date,
      timeZone: resolved.member.household.timeZone,
    });
    const response: TodayApiResponse = {
      householdName: resolved.member.household.name,
      date: dashboard.date,
      timeZone: dashboard.timeZone,
      items: dashboard.items.map((item) => ({ id: item.id, appId: item.appId, label: item.label, deepLink: item.deepLink })),
      overflowCount: dashboard.overflowCount,
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestContextError) {
      const status = error.reason === "unauthenticated" ? 401 : 409;
      return NextResponse.json({ error: error.message }, { status, headers: { "Cache-Control": "no-store" } });
    }
    throw error;
  }
}
