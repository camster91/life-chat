import { NextRequest, NextResponse } from "next/server";
import { readAuthEnvironment } from "@/lib/auth-environment";
import { getDatabase } from "@/lib/database";
import { NotificationPreferenceCommandError, saveNotificationPreference } from "@/lib/notification-preference-repository";
import { RequestContextError, resolveRequestContext } from "@/lib/server-request-context";

function minute(value: unknown): number | null {
  return Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) < 1440 ? value as number : null;
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== readAuthEnvironment().trustedOrigin) return NextResponse.json({ error: "The request origin is not allowed." }, { status: 403 });
  try {
    const resolved = await resolveRequestContext(request);
    const body: unknown = await request.json().catch(() => null);
    if (typeof body !== "object" || body === null || !("remindersEnabled" in body) || typeof body.remindersEnabled !== "boolean" || !("timeZone" in body) || typeof body.timeZone !== "string") {
      return NextResponse.json({ error: "Valid notification preferences are required." }, { status: 400 });
    }
    const quietHoursValue = "quietHours" in body ? body.quietHours : null;
    let quietHours: { startMinute: number; endMinute: number } | null = null;
    if (quietHoursValue !== null) {
      if (typeof quietHoursValue !== "object" || !("startMinute" in quietHoursValue) || !("endMinute" in quietHoursValue)) return NextResponse.json({ error: "Quiet hours must contain valid start and end times." }, { status: 400 });
      const startMinute = minute(quietHoursValue.startMinute);
      const endMinute = minute(quietHoursValue.endMinute);
      if (startMinute === null || endMinute === null) return NextResponse.json({ error: "Quiet hours must contain valid start and end times." }, { status: 400 });
      quietHours = { startMinute, endMinute };
    }
    const preference = await saveNotificationPreference(getDatabase(), { context: resolved.context, grants: [], remindersEnabled: body.remindersEnabled, quietHours, timeZone: body.timeZone, now: new Date() });
    return NextResponse.json(preference, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestContextError) return NextResponse.json({ error: error.message }, { status: error.reason === "unauthenticated" ? 401 : 409 });
    if (error instanceof NotificationPreferenceCommandError) return NextResponse.json({ error: "Notification preferences are not available for this household member." }, { status: 403 });
    if (error instanceof RangeError) return NextResponse.json({ error: "The notification preferences could not be saved." }, { status: 400 });
    throw error;
  }
}
