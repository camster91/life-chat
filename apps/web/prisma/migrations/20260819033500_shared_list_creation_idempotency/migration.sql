ALTER TABLE "shared_lists" ADD COLUMN "creationCommandId" TEXT;
ALTER TABLE "shared_list_items" ADD COLUMN "creationCommandId" TEXT;
CREATE UNIQUE INDEX "shared_lists_creationCommandId_key" ON "shared_lists"("creationCommandId");
CREATE UNIQUE INDEX "shared_list_items_creationCommandId_key" ON "shared_list_items"("creationCommandId");
