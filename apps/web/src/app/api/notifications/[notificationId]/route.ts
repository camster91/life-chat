import { NextRequest, NextResponse } from "next/server";
import { readAuthEnvironment } from "@/lib/auth-environment";
import { getDatabase } from "@/lib/database";
import { dismissNotification, markNotificationRead, NotificationCommandError } from "@/lib/notification-repository";
import { RequestContextError, resolveRequestContext } from "@/lib/server-request-context";

export async function POST(request: NextRequest, { params }: { params: Promise<{ notificationId: string }> }) {
  if (request.headers.get("origin") !== readAuthEnvironment().trustedOrigin) return NextResponse.json({ error: "The request origin is not allowed." }, { status: 403 });
  try {
    const resolved = await resolveRequestContext(request);
    const body: unknown = await request.json().catch(() => null);
    const action = typeof body === "object" && body !== null && "action" in body && (body.action === "read" || body.action === "dismiss") ? body.action : null;
    if (action === null) return NextResponse.json({ error: "Choose a valid notification action." }, { status: 400 });
    const { notificationId } = await params;
    const input = { context: resolved.context, grants: [], notificationId, now: new Date() };
    const notification = action === "read" ? await markNotificationRead(getDatabase(), input) : await dismissNotification(getDatabase(), input);
    return NextResponse.json({ id: notification.id, state: notification.state }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestContextError) return NextResponse.json({ error: error.message }, { status: error.reason === "unauthenticated" ? 401 : 409 });
    if (error instanceof NotificationCommandError) return NextResponse.json({ error: "The notification action could not be completed." }, { status: 409 });
    throw error;
  }
}
