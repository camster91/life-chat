import { NextRequest, NextResponse } from "next/server";
import { readAuthEnvironment } from "@/lib/auth-environment";
import type { AppsApiResponse } from "@/lib/apps-api";
import { getDatabase } from "@/lib/database";
import { loadHouseholdMiniAppConfiguration, MiniAppConfigurationConflictError, MiniAppConfigurationError, setHouseholdMiniAppEnabled } from "@/lib/identity-repository";
import { activationEligibility, miniAppRegistry, type MiniAppId } from "@/lib/mini-app-registry";
import { authorize } from "@/lib/permission-engine";
import { RequestContextError, resolveRequestContext } from "@/lib/server-request-context";

export const dynamic = "force-dynamic";
function json(body: AppsApiResponse | { error: string } | { appId: MiniAppId; enabled: boolean; version: number }, status = 200) { return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } }); }

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveRequestContext(request);
    const now = new Date();
    const canRead = authorize({ context: resolved.context, role: resolved.member.role, grants: [], request: { householdId: resolved.context.householdId, permission: "household.read" }, now }).allowed;
    if (!canRead) return json({ error: "Apps are not available for this member." }, 403);
    const canManage = authorize({ context: resolved.context, role: resolved.member.role, grants: [], request: { householdId: resolved.context.householdId, permission: "mini-app.configure" }, now }).allowed;
    const configuration = await loadHouseholdMiniAppConfiguration(getDatabase(), resolved.context.householdId);
    const stored = await getDatabase().householdMiniAppConfiguration.findMany({ where: { householdId: resolved.context.householdId }, select: { appId: true, version: true } });
    const versions = new Map(stored.map((item) => [item.appId, item.version]));
    const visible = canManage ? miniAppRegistry : miniAppRegistry.filter((app) => configuration[app.id].enabled && activationEligibility(app.id, configuration).eligible);
    return json({ canManage, apps: visible.map((app) => ({ id: app.id, label: app.label, enabled: configuration[app.id].enabled, eligible: activationEligibility(app.id, configuration).eligible, version: versions.get(app.id) ?? 0, dependencies: app.dependsOn.map((id) => miniAppRegistry.find((candidate) => candidate.id === id)!.label), enabledDependents: miniAppRegistry.filter((candidate) => candidate.dependsOn.includes(app.id) && configuration[candidate.id].enabled).map((candidate) => candidate.label) })) });
  } catch (error) {
    if (error instanceof RequestContextError) return json({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== readAuthEnvironment().trustedOrigin) return json({ error: "The request origin is not allowed." }, 403);
  try {
    const resolved = await resolveRequestContext(request);
    const body: unknown = await request.json().catch(() => null);
    const appId = typeof body === "object" && body !== null && "appId" in body && typeof body.appId === "string" && miniAppRegistry.some((app) => app.id === body.appId) ? body.appId as MiniAppId : null;
    const enabled = typeof body === "object" && body !== null && "enabled" in body && typeof body.enabled === "boolean" ? body.enabled : null;
    const expectedVersion = typeof body === "object" && body !== null && "expectedVersion" in body && typeof body.expectedVersion === "number" ? body.expectedVersion : -1;
    const commandId = typeof body === "object" && body !== null && "commandId" in body && typeof body.commandId === "string" ? body.commandId : "";
    if (appId === null || enabled === null) return json({ error: "A valid app change is required." }, 400);
    const saved = await setHouseholdMiniAppEnabled(getDatabase(), { actor: { context: resolved.context, grants: [] }, appId, enabled, expectedVersion, commandId, now: new Date() });
    return json({ appId, enabled: saved.enabled, version: saved.version });
  } catch (error) {
    if (error instanceof RequestContextError) return json({ error: error.message }, error.reason === "unauthenticated" ? 401 : 409);
    if (error instanceof MiniAppConfigurationConflictError) return json({ error: "The app configuration changed. Reload before trying again." }, 409);
    if (error instanceof MiniAppConfigurationError) return json({ error: "The app change is not allowed." }, 403);
    throw error;
  }
}
