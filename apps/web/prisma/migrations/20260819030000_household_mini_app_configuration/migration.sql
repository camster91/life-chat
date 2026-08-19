CREATE TABLE "household_mini_app_configurations" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "settingsSchemaVersion" INTEGER NOT NULL DEFAULT 1,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "household_mini_app_configurations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "household_mini_app_configurations_householdId_enabled_idx"
  ON "household_mini_app_configurations"("householdId", "enabled");

CREATE UNIQUE INDEX "household_mini_app_configurations_householdId_appId_key"
  ON "household_mini_app_configurations"("householdId", "appId");

ALTER TABLE "household_mini_app_configurations"
  ADD CONSTRAINT "household_mini_app_configurations_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
