import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { readAuthEnvironment } from "./auth-environment";

const globalForDatabase = globalThis as typeof globalThis & {
  lifeChatPrisma?: PrismaClient;
};

export function getDatabase(): PrismaClient {
  if (globalForDatabase.lifeChatPrisma === undefined) {
    const { databaseUrl } = readAuthEnvironment();
    const adapter = new PrismaPg({ connectionString: databaseUrl });
    globalForDatabase.lifeChatPrisma = new PrismaClient({ adapter });
  }

  return globalForDatabase.lifeChatPrisma;
}
