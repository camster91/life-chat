import { NextRequest, NextResponse } from "next/server";
import { readAuthEnvironment } from "@/lib/auth-environment";
import { createAllDayCalendarItem, loadCalendarAgenda, CalendarAccessError, CalendarCommandError } from "@/lib/calendar-repository";
import type { CalendarApiResponse } from "@/lib/calendar-api";
import { dateOnlyAtInstant, parseDateOnly } from "@/lib/date-time";
import { getDatabase } from "@/lib/database";
import { RequestContextError, resolveRequestContext } from "@/lib/server-request-context";
import { authorize } from "@/lib/permission-engine";

export const dynamic = "force-dynamic";

function json(body: CalendarApiResponse | { error: string } | { id: string; title: string; kind: "all-day"; startDate: string | null; endDateExclusive: string | null }, status = 200) {
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
      canManage: authorize({ context: resolved.context, role: resolved.member.role, grants: [], request: { householdId: resolved.context.householdId, permission: "calendar.manage" }, now }).allowed,
      items: items.map(({ householdId: _householdId, authorized: _authorized, ...item }) => item),
    });
  } catch (error) {
    if (error instanceof RequestContextError) return json({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409);
    if (error instanceof CalendarAccessError) return json({ error: "Calendar is not available for this household member." }, 403);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== readAuthEnvironment().trustedOrigin) return json({ error: "The request origin is not allowed." }, 403);
  try {
    const resolved = await resolveRequestContext(request);
    const body: unknown = await request.json().catch(() => null);
    const title = typeof body === "object" && body !== null && "title" in body && typeof body.title === "string" ? body.title : "";
    const date = typeof body === "object" && body !== null && "date" in body && typeof body.date === "string" ? body.date : "";
    const commandId = typeof body === "object" && body !== null && "commandId" in body && typeof body.commandId === "string" ? body.commandId : "";
    const item = await createAllDayCalendarItem(getDatabase(), { actor: { context: resolved.context, grants: [] }, title, date, commandId, now: new Date() });
    return json({ id: item.id, title: item.title, kind: "all-day", startDate: item.startDate, endDateExclusive: item.endDateExclusive }, 201);
  } catch (error) {
    if (error instanceof RequestContextError) return json({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409);
    if (error instanceof CalendarAccessError) return json({ error: "Calendar changes are not available for this household member." }, 403);
    if (error instanceof CalendarCommandError) return json({ error: "The calendar item could not be created. Check the title and date." }, 400);
    throw error;
  }
}
