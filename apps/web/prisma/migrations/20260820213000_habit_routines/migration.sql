CREATE TABLE "habit_routines" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "ownerMemberId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "creationCommandId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "habit_routines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "habit_routines_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "habit_routines_householdId_ownerMemberId_fkey" FOREIGN KEY ("householdId", "ownerMemberId") REFERENCES "members"("householdId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "habit_routines_creationCommandId_key" ON "habit_routines"("creationCommandId");
CREATE UNIQUE INDEX "habit_routines_householdId_id_key" ON "habit_routines"("householdId", "id");
CREATE INDEX "habit_routines_householdId_ownerMemberId_archivedAt_idx" ON "habit_routines"("householdId", "ownerMemberId", "archivedAt");

CREATE TABLE "habit_completions" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "routineId" TEXT NOT NULL,
  "completionDate" TEXT NOT NULL,
  "completionCommandId" TEXT,
  "completedByMemberId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "habit_completions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "habit_completions_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "habit_completions_householdId_routineId_fkey" FOREIGN KEY ("householdId", "routineId") REFERENCES "habit_routines"("householdId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "habit_completions_completionCommandId_key" ON "habit_completions"("completionCommandId");
CREATE UNIQUE INDEX "habit_completions_routineId_completionDate_key" ON "habit_completions"("routineId", "completionDate");
CREATE INDEX "habit_completions_householdId_completionDate_idx" ON "habit_completions"("householdId", "completionDate");
