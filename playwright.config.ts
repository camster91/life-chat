import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

if (process.env.LIFE_CHAT_E2E_ENV_FILE !== undefined) {
  process.loadEnvFile(resolve(process.env.LIFE_CHAT_E2E_ENV_FILE));
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    browserName: "chromium",
    colorScheme: "light",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
  },
});
