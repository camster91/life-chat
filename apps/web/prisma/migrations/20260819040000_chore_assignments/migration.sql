CREATE TYPE "ChoreAssignmentState" AS ENUM ('assigned', 'completed');

CREATE TABLE "chore_assignments" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "assigneeMemberId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TEXT,
    "state" "ChoreAssignmentState" NOT NULL DEFAULT 'assigned',
    "version" INTEGER NOT NULL DEFAULT 1,
    "completionCommandId" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedByMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "chore_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chore_assignments_completionCommandId_key" ON "chore_assignments"("completionCommandId");
CREATE INDEX "chore_assignments_householdId_assigneeMemberId_state_idx" ON "chore_assignments"("householdId", "assigneeMemberId", "state");
ALTER TABLE "chore_assignments" ADD CONSTRAINT "chore_assignments_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
