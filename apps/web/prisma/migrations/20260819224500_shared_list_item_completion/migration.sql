ALTER TABLE "shared_list_items"
ADD COLUMN "completionCommandId" TEXT;

CREATE UNIQUE INDEX "shared_list_items_completionCommandId_key"
ON "shared_list_items"("completionCommandId");
