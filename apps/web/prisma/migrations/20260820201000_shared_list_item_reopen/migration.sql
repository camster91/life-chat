-- Reopening a completed item is a separate replay-safe command from completion.
ALTER TABLE "shared_list_items" ADD COLUMN "reopenCommandId" TEXT;

CREATE UNIQUE INDEX "shared_list_items_reopenCommandId_key"
  ON "shared_list_items"("reopenCommandId");
