ALTER TABLE "chore_assignments"
  ADD COLUMN "creationCommandId" TEXT;

CREATE UNIQUE INDEX "chore_assignments_creationCommandId_key"
  ON "chore_assignments"("creationCommandId");
