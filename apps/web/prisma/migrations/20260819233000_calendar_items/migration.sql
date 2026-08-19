CREATE TYPE "CalendarItemKind" AS ENUM ('all_day', 'timed');
CREATE TYPE "CalendarItemVisibility" AS ENUM ('household', 'personal');

CREATE TABLE "calendar_items" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "ownerMemberId" TEXT,
    "title" TEXT NOT NULL,
    "kind" "CalendarItemKind" NOT NULL,
    "visibility" "CalendarItemVisibility" NOT NULL DEFAULT 'household',
    "startDate" TEXT,
    "endDateExclusive" TEXT,
    "startLocalDateTime" TEXT,
    "endLocalDateTime" TEXT,
    "timeZone" TEXT,
    "startInstant" TIMESTAMPTZ(3),
    "endInstant" TIMESTAMPTZ(3),
    "sourceAppId" TEXT,
    "sourceRecordId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "calendar_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "calendar_items_title_check" CHECK (char_length(btrim("title")) BETWEEN 1 AND 200 AND "title" !~ E'[\\r\\n]'),
    CONSTRAINT "calendar_items_source_check" CHECK (char_length(coalesce("sourceAppId", '')) <= 100 AND char_length(coalesce("sourceRecordId", '')) <= 200),
    CONSTRAINT "calendar_items_version_check" CHECK ("version" >= 1),
    CONSTRAINT "calendar_items_owner_check" CHECK ("visibility" <> 'personal' OR "ownerMemberId" IS NOT NULL),
    CONSTRAINT "calendar_items_shape_check" CHECK (
      ("kind" = 'all_day' AND "startDate" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND "endDateExclusive" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' AND "startDate" < "endDateExclusive"
        AND "startLocalDateTime" IS NULL AND "endLocalDateTime" IS NULL AND "timeZone" IS NULL AND "startInstant" IS NULL AND "endInstant" IS NULL)
      OR
      ("kind" = 'timed' AND "startDate" IS NULL AND "endDateExclusive" IS NULL
        AND "startLocalDateTime" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}(:[0-9]{2}(\\.[0-9]+)?)?$'
        AND "endLocalDateTime" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}(:[0-9]{2}(\\.[0-9]+)?)?$'
        AND char_length("timeZone") BETWEEN 1 AND 100
        AND "startInstant" IS NOT NULL AND "endInstant" IS NOT NULL AND "startInstant" < "endInstant")
    )
);

CREATE INDEX "calendar_items_householdId_startDate_endDateExclusive_idx" ON "calendar_items"("householdId", "startDate", "endDateExclusive");
CREATE INDEX "calendar_items_householdId_startInstant_endInstant_idx" ON "calendar_items"("householdId", "startInstant", "endInstant");
CREATE INDEX "calendar_items_householdId_ownerMemberId_visibility_idx" ON "calendar_items"("householdId", "ownerMemberId", "visibility");

ALTER TABLE "calendar_items" ADD CONSTRAINT "calendar_items_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "calendar_items" ADD CONSTRAINT "calendar_items_householdId_ownerMemberId_fkey" FOREIGN KEY ("householdId", "ownerMemberId") REFERENCES "members"("householdId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
