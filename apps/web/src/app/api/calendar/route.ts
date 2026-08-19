import { NextRequest, NextResponse } from "next/server";
import { loadCalendarAgenda, CalendarAccessError } from "@/lib/calendar-repository";
import type { CalendarApiResponse } from "@/lib/calendar-api";
import { dateOnlyAtInstant, parseDateOnly } from "@/lib/date-time";
import { getDatabase } from "@/lib/database";
import { RequestContextError, resolveRequestContext } from "@/lib/server-request-context";

export const dynamic = "force-dynamic";

function json(body: CalendarApiResponse | { error: string }, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveRequestContext(request);
    const now = new Date();
    const requestedDate = request.nextUrl.searchParams.get("date");
    let date: string;
    if (requestedDate === null) {
      date = dateOnlyAtInstant({ instant: now.toISOString(), timeZone: resolved.member.household.timeZone });
    } else {
      try { parseDateOnly(requestedDate); }
      catch { return json({ error: "Choose a valid calendar date." }, 400); }
      date = requestedDate;
    }
    const items = await loadCalendarAgenda(getDatabase(), { actor: { context: resolved.context, grants: [] }, date, now });
    return json({
      householdName: resolved.member.household.name,
      date,
      timeZone: resolved.member.household.timeZone,
      locale: resolved.member.household.locale,
      items: items.map(({ householdId: _householdId, authorized: _authorized, ...item }) => item),
    });
  } catch (error) {
    if (error instanceof RequestContextError) return json({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409);
    if (error instanceof CalendarAccessError) return json({ error: "Calendar is not available for this household member." }, 403);
    throw error;
  }
}
