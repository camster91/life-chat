import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth/minimal";
import type { PrismaClient } from "../../generated/prisma/client";
import type { AuthEnvironment } from "./auth-environment";
import type { InvitationAccountProvisioner } from "./invitation-account-entry";

function setCookieValues(headers: Headers): string[] {
  const extended = headers as Headers & { getSetCookie?: () => string[] };
  if (extended.getSetCookie !== undefined) return extended.getSetCookie();
  const combined = headers.get("set-cookie");
  return combined === null ? [] : [combined];
}

function cookieRequestHeader(setCookies: readonly string[]): string {
  return setCookies.map((value) => value.split(";", 1)[0]).join("; ");
}

/**
 * Creates a Better Auth instance that is never mounted as an HTTP handler.
 * Its supported server API is the only account-creation boundary used by the
 * invite route; the public auth instance keeps sign-up disabled.
 */
export function createInvitationAccountProvisioner(input: {
  database: PrismaClient;
  environment: AuthEnvironment;
  requestHeaders: Headers;
  establishSession?: boolean;
}): InvitationAccountProvisioner {
  const establishSession = input.establishSession ?? true;
  const auth = betterAuth({
    baseURL: input.environment.betterAuthUrl,
    secret: input.environment.betterAuthSecret,
    trustedOrigins: [input.environment.trustedOrigin],
    database: prismaAdapter(input.database, { provider: "postgresql", transaction: true }),
    logger: { level: "error" },
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      autoSignIn: establishSession,
      revokeSessionsOnPasswordReset: true,
    },
    user: { deleteUser: { enabled: true } },
  });

  return {
    async create(account) {
      const result = await auth.api.signUpEmail({
        body: { email: account.email, password: account.password, name: account.name, rememberMe: true },
        headers: input.requestHeaders,
        returnHeaders: true,
      });
      const setCookies = setCookieValues(result.headers);
      if (establishSession && setCookies.length === 0) throw new Error("The account provider did not establish a session.");
      return {
        subjectId: result.response.user.id,
        setCookies,
        async rollback() {
          let cleanupCookies = setCookies;
          if (cleanupCookies.length === 0) {
            const signIn = await auth.api.signInEmail({
              body: { email: account.email, password: account.password, rememberMe: false },
              headers: input.requestHeaders,
              returnHeaders: true,
            });
            cleanupCookies = setCookieValues(signIn.headers);
          }
          if (cleanupCookies.length === 0) throw new Error("The account provider did not establish a cleanup session.");
          const cleanupHeaders = new Headers(input.requestHeaders);
          cleanupHeaders.set("cookie", cookieRequestHeader(cleanupCookies));
          await auth.api.deleteUser({ body: { password: account.password }, headers: cleanupHeaders });
        },
      };
    },
  };
}
