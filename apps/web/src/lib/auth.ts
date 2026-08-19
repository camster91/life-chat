import "server-only";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth/minimal";
import { readAuthEnvironment } from "./auth-environment";
import { getDatabase } from "./database";

function createAuth() {
  const environment = readAuthEnvironment();
  return betterAuth({
    baseURL: environment.betterAuthUrl,
    secret: environment.betterAuthSecret,
    trustedOrigins: [environment.trustedOrigin],
    database: prismaAdapter(getDatabase(), {
      provider: "postgresql",
      transaction: true,
    }),
    emailAndPassword: {
      enabled: true,
      // Account creation is permitted only through a future, server-authorized
      // invitation acceptance command. The public Better Auth sign-up endpoint
      // must stay disabled.
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      autoSignIn: false,
      revokeSessionsOnPasswordReset: true,
    },
  });
}

type ConfiguredAuth = ReturnType<typeof createAuth>;

let configuredAuth: ConfiguredAuth | undefined;

export function getAuth(): ConfiguredAuth {
  if (configuredAuth !== undefined) {
    return configuredAuth;
  }

  const createdAuth = createAuth();
  configuredAuth = createdAuth;
  return createdAuth;
}
