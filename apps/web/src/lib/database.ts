import "server-only";
import { PrismaClient } from "../../generated/prisma/client";
import { readAuthEnvironment } from "./auth-environment";
import { createPostgresAdapter } from "./postgres-adapter";

const globalForDatabase = globalThis as typeof globalThis & {
  lifeChatPrisma?: PrismaClient;
};

export function getDatabase(): PrismaClient {
  if (globalForDatabase.lifeChatPrisma === undefined) {
    const { databaseUrl } = readAuthEnvironment();
    const adapter = createPostgresAdapter(databaseUrl);
    globalForDatabase.lifeChatPrisma = new PrismaClient({ adapter });
  }

  return globalForDatabase.lifeChatPrisma;
}
