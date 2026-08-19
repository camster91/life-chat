import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { readAuthEnvironment } from "@/lib/auth-environment";
import { getDatabase } from "@/lib/database";
import { acceptHouseholdInvitation } from "@/lib/identity-repository";
import { InvitationAccountEntryError, acceptInvitationForNewAccount } from "@/lib/invitation-account-entry";
import { createInvitationAccountProvisioner } from "@/lib/invitation-auth";

export const dynamic = "force-dynamic";

function json(body: { status: "accepted" } | { error: string }, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function field(body: unknown, name: string): string {
  return typeof body === "object" && body !== null && name in body && typeof body[name as keyof typeof body] === "string"
    ? body[name as keyof typeof body] as string
    : "";
}

export async function POST(request: NextRequest) {
  const environment = readAuthEnvironment();
  if (request.headers.get("origin") !== environment.trustedOrigin) return json({ error: "The request origin is not allowed." }, 403);
  const body: unknown = await request.json().catch(() => null);
  const token = field(body, "token");
  if (token.trim().length < 20 || token.length > 200 || /\s/.test(token)) return json({ error: "The invitation is not available." }, 400);

  const session = await getAuth().api.getSession({ headers: request.headers });
  try {
    if (session !== null) {
      await acceptHouseholdInvitation(getDatabase(), { token, subjectId: session.user.id, now: new Date() });
      return json({ status: "accepted" });
    }

    const email = field(body, "email").trim();
    const password = field(body, "password");
    if (email.length === 0 || email.length > 320 || password.length < 12 || password.length > 128) {
      return json({ error: "Valid account details and a 12–128 character password are required." }, 400);
    }
    const result = await acceptInvitationForNewAccount(getDatabase(), {
      token,
      email,
      password,
      now: new Date(),
      provisioner: createInvitationAccountProvisioner({ database: getDatabase(), environment, requestHeaders: request.headers }),
    });
    const response = json({ status: "accepted" }, 201);
    for (const setCookie of result.setCookies) response.headers.append("set-cookie", setCookie);
    return response;
  } catch (error) {
    if (error instanceof InvitationAccountEntryError) return json({ error: "The invitation could not be accepted. Sign in first if this email already has an account." }, 409);
    return json({ error: "The invitation is invalid, expired, already used, or cannot be linked to this account." }, 409);
  }
}
