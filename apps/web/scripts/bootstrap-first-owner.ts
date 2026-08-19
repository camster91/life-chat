import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { readAuthEnvironment } from "../src/lib/auth-environment";
import { bootstrapFirstOwnerAccount } from "../src/lib/first-owner-account-entry";
import { createInvitationAccountProvisioner } from "../src/lib/invitation-auth-core";
import { createPostgresAdapter } from "../src/lib/postgres-adapter";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (value === undefined || value.length === 0) throw new Error(`${name} is required.`);
  return value;
}

async function main() {
  if (required("LIFE_CHAT_BOOTSTRAP_CONFIRM") !== "CREATE_FIRST_LIFE_CHAT_OWNER") throw new Error("Explicit bootstrap confirmation is required.");
  const environment = readAuthEnvironment();
  const database = new PrismaClient({ adapter: createPostgresAdapter(environment.databaseUrl) });
  try {
    await bootstrapFirstOwnerAccount(database, {
      localOperatorConfirmed: true,
      email: required("LIFE_CHAT_BOOTSTRAP_EMAIL"),
      password: required("LIFE_CHAT_BOOTSTRAP_PASSWORD"),
      householdName: required("LIFE_CHAT_BOOTSTRAP_HOUSEHOLD_NAME"),
      displayName: required("LIFE_CHAT_BOOTSTRAP_DISPLAY_NAME"),
      now: new Date(),
      provisioner: createInvitationAccountProvisioner({
        database,
        environment,
        requestHeaders: new Headers({ origin: environment.trustedOrigin, "user-agent": "life-chat-local-bootstrap" }),
        establishSession: false,
      }),
    });
    process.stdout.write("First Life Chat owner created. Public signup remains disabled.\n");
  } finally {
    await database.$disconnect();
  }
}

main().catch(() => {
  process.stderr.write("First-owner setup failed. No secret or account detail was printed.\n");
  process.exitCode = 1;
});
