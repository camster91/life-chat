CREATE TYPE "SharedListItemState" AS ENUM ('open', 'completed');

CREATE TABLE "shared_lists" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shared_lists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shared_list_items" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "state" "SharedListItemState" NOT NULL DEFAULT 'open',
    "version" INTEGER NOT NULL DEFAULT 1,
    "assignedMemberId" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedByMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shared_list_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "shared_lists_householdId_updatedAt_idx" ON "shared_lists"("householdId", "updatedAt");
CREATE INDEX "shared_list_items_householdId_state_idx" ON "shared_list_items"("householdId", "state");
CREATE INDEX "shared_list_items_assignedMemberId_idx" ON "shared_list_items"("assignedMemberId");
CREATE UNIQUE INDEX "shared_list_items_listId_position_key" ON "shared_list_items"("listId", "position");

ALTER TABLE "shared_lists" ADD CONSTRAINT "shared_lists_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shared_list_items" ADD CONSTRAINT "shared_list_items_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shared_list_items" ADD CONSTRAINT "shared_list_items_listId_fkey" FOREIGN KEY ("listId") REFERENCES "shared_lists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
