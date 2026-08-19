export type AuthEnvironment = {
  databaseUrl: string;
  betterAuthUrl: string;
  trustedOrigin: string;
  betterAuthSecret: string;
};

export class AuthEnvironmentError extends Error {}

type EnvironmentValues = Readonly<Record<string, string | undefined>>;

function required(environment: EnvironmentValues, name: string): string {
  const value = environment[name]?.trim();
  if (value === undefined || value.length === 0) {
    throw new AuthEnvironmentError(`${name} must be configured outside source control.`);
  }

  return value;
}

export function readAuthEnvironment(environment: EnvironmentValues = process.env): AuthEnvironment {
  const databaseUrl = required(environment, "DATABASE_URL");
  const betterAuthUrl = required(environment, "BETTER_AUTH_URL");
  const betterAuthSecret = required(environment, "BETTER_AUTH_SECRET");

  if (betterAuthSecret.length < 32) {
    throw new AuthEnvironmentError("BETTER_AUTH_SECRET must contain at least 32 characters.");
  }

  let trustedOrigin: string;
  try {
    const parsed = new URL(betterAuthUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
    trustedOrigin = parsed.origin;
  } catch {
    throw new AuthEnvironmentError("BETTER_AUTH_URL must be an absolute HTTP(S) URL.");
  }

  if (!databaseUrl.startsWith("postgresql://") && !databaseUrl.startsWith("postgres://")) {
    throw new AuthEnvironmentError("DATABASE_URL must be a PostgreSQL connection URL.");
  }

  return { databaseUrl, betterAuthUrl, trustedOrigin, betterAuthSecret };
}
