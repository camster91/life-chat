import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Generation and validation inspect only the schema. A non-routable
    // placeholder lets those checks run without a local database or secret.
    // Runtime access uses the required DATABASE_URL in auth-environment.ts.
    url: process.env.DATABASE_URL ?? "postgresql://life_chat:placeholder@127.0.0.1:5432/life_chat",
  },
});
