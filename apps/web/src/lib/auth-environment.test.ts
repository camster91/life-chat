import { describe, expect, it } from "vitest";
import { AuthEnvironmentError, readAuthEnvironment } from "./auth-environment";

const completeEnvironment = {
  DATABASE_URL: "postgresql://life_chat:local-only@127.0.0.1:5432/life_chat",
  BETTER_AUTH_URL: "https://life-chat.example.test",
  BETTER_AUTH_SECRET: "a-long-test-secret-that-is-never-used-outside-tests",
};

describe("readAuthEnvironment", () => {
  it("accepts a complete local PostgreSQL and Better Auth configuration", () => {
    expect(readAuthEnvironment(completeEnvironment)).toEqual({
      databaseUrl: completeEnvironment.DATABASE_URL,
      betterAuthUrl: completeEnvironment.BETTER_AUTH_URL,
      trustedOrigin: "https://life-chat.example.test",
      betterAuthSecret: completeEnvironment.BETTER_AUTH_SECRET,
    });
  });

  it("fails closed when a required secret is absent or weak", () => {
    expect(() => readAuthEnvironment({ ...completeEnvironment, BETTER_AUTH_SECRET: "short" })).toThrow(AuthEnvironmentError);
    expect(() => readAuthEnvironment({ ...completeEnvironment, BETTER_AUTH_SECRET: "" })).toThrow(AuthEnvironmentError);
  });

  it("rejects non-HTTP origins and non-PostgreSQL database URLs", () => {
    expect(() => readAuthEnvironment({ ...completeEnvironment, BETTER_AUTH_URL: "file:///tmp/life-chat" })).toThrow(AuthEnvironmentError);
    expect(() => readAuthEnvironment({ ...completeEnvironment, DATABASE_URL: "mysql://localhost/life_chat" })).toThrow(AuthEnvironmentError);
  });
});
