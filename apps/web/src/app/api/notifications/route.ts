import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
import type { NotificationsApiResponse } from "@/lib/notifications-api";
import { loadNotificationPreference, NotificationPreferenceCommandError } from "@/lib/notification-preference-repository";
import { loadNotificationInbox, NotificationCommandError } from "@/lib/notification-repository";
import { RequestContextError, resolveRequestContext } from "@/lib/server-request-context";

export const dynamic = "force-dynamic";

function json(body: NotificationsApiResponse | { error: string }, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveRequestContext(request);
    const now = new Date();
    const input = { context: resolved.context, grants: [], now };
    const [inbox, storedPreference] = await Promise.all([
      loadNotificationInbox(getDatabase(), input),
      loadNotificationPreference(getDatabase(), input),
    ]);
    return json({
      householdName: resolved.member.household.name,
      locale: resolved.member.household.locale,
      inbox,
      preference: storedPreference ?? { remindersEnabled: true, quietHours: null, timeZone: resolved.member.household.timeZone },
    });
  } catch (error) {
    if (error instanceof RequestContextError) return json({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409);
    if (error instanceof NotificationCommandError || error instanceof NotificationPreferenceCommandError) return json({ error: "Notifications are not available for this household member." }, 403);
    throw error;
  }
}
