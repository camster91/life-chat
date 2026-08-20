CREATE TYPE "MealSlot" AS ENUM ('breakfast', 'lunch', 'dinner', 'other');
CREATE TABLE "meal_plan_entries" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "mealSlot" "MealSlot" NOT NULL,
  "label" TEXT NOT NULL,
  "creationCommandId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "meal_plan_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "meal_plan_entries_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "meal_plan_entries_creationCommandId_key" ON "meal_plan_entries"("creationCommandId");
CREATE INDEX "meal_plan_entries_householdId_date_archivedAt_idx" ON "meal_plan_entries"("householdId", "date", "archivedAt");
