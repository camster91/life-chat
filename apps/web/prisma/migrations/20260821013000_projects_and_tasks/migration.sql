CREATE TYPE "ProjectScope" AS ENUM ('household', 'personal');
CREATE TYPE "ProjectStatus" AS ENUM ('active', 'paused', 'complete');
CREATE TABLE "projects" (
  "id" TEXT NOT NULL, "householdId" TEXT NOT NULL, "ownerMemberId" TEXT, "label" TEXT NOT NULL,
  "scope" "ProjectScope" NOT NULL DEFAULT 'household', "status" "ProjectStatus" NOT NULL DEFAULT 'active',
  "sharedListId" TEXT, "calendarItemId" TEXT, "creationCommandId" TEXT, "version" INTEGER NOT NULL DEFAULT 1,
  "archivedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "projects_pkey" PRIMARY KEY ("id"), CONSTRAINT "projects_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "projects_creationCommandId_key" ON "projects"("creationCommandId");
CREATE INDEX "projects_householdId_ownerMemberId_status_idx" ON "projects"("householdId", "ownerMemberId", "status");
CREATE TABLE "project_tasks" (
  "id" TEXT NOT NULL, "householdId" TEXT NOT NULL, "projectId" TEXT NOT NULL, "label" TEXT NOT NULL, "completedAt" TIMESTAMP(3), "creationCommandId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id"), CONSTRAINT "project_tasks_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE, CONSTRAINT "project_tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "project_tasks_creationCommandId_key" ON "project_tasks"("creationCommandId");
CREATE INDEX "project_tasks_householdId_projectId_completedAt_idx" ON "project_tasks"("householdId", "projectId", "completedAt");
