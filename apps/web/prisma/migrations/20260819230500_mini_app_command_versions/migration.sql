ALTER TABLE "household_mini_app_configurations"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "mini_app_configuration_commands" (
    "commandId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "actorMemberId" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mini_app_configuration_commands_pkey" PRIMARY KEY ("commandId")
);

CREATE INDEX "mini_app_configuration_commands_householdId_appId_createdAt_idx"
ON "mini_app_configuration_commands"("householdId", "appId", "createdAt");

ALTER TABLE "mini_app_configuration_commands"
ADD CONSTRAINT "mini_app_configuration_commands_householdId_fkey"
FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
