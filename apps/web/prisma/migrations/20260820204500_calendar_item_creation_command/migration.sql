-- Creation commands are retained so an interrupted client can safely retry.
ALTER TABLE "calendar_items" ADD COLUMN "creationCommandId" TEXT;

CREATE UNIQUE INDEX "calendar_items_creationCommandId_key"
  ON "calendar_items"("creationCommandId");
