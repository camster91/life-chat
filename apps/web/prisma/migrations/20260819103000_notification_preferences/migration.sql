ALTER TABLE "members"
ADD CONSTRAINT "members_householdId_id_key" UNIQUE ("householdId", "id");

CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "remindersEnabled" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursStartMinute" INTEGER,
    "quietHoursEndMinute" INTEGER,
    "timeZone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "notification_preferences_quiet_hours_check" CHECK (
        ("quietHoursStartMinute" IS NULL AND "quietHoursEndMinute" IS NULL)
        OR (
            "quietHoursStartMinute" BETWEEN 0 AND 1439
            AND "quietHoursEndMinute" BETWEEN 0 AND 1439
            AND "quietHoursStartMinute" <> "quietHoursEndMinute"
        )
    )
);

CREATE UNIQUE INDEX "notification_preferences_householdId_memberId_key"
ON "notification_preferences"("householdId", "memberId");

ALTER TABLE "notification_preferences"
ADD CONSTRAINT "notification_preferences_householdId_fkey"
FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notification_preferences"
ADD CONSTRAINT "notification_preferences_householdId_memberId_fkey"
FOREIGN KEY ("householdId", "memberId") REFERENCES "members"("householdId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
