CREATE TABLE "rewards" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "creationCommandId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rewards_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rewards_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "rewards_creationCommandId_key" ON "rewards"("creationCommandId");
CREATE UNIQUE INDEX "rewards_householdId_id_key" ON "rewards"("householdId", "id");
CREATE INDEX "rewards_householdId_archivedAt_idx" ON "rewards"("householdId", "archivedAt");

CREATE TYPE "RewardRequestState" AS ENUM ('requested', 'approved', 'rejected');
CREATE TABLE "reward_requests" (
  "id" TEXT NOT NULL,
  "householdId" TEXT NOT NULL,
  "rewardId" TEXT NOT NULL,
  "requesterMemberId" TEXT NOT NULL,
  "state" "RewardRequestState" NOT NULL DEFAULT 'requested',
  "requestCommandId" TEXT,
  "decisionCommandId" TEXT,
  "decidedByMemberId" TEXT,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reward_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reward_requests_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "reward_requests_householdId_rewardId_fkey" FOREIGN KEY ("householdId", "rewardId") REFERENCES "rewards"("householdId", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "reward_requests_requestCommandId_key" ON "reward_requests"("requestCommandId");
CREATE UNIQUE INDEX "reward_requests_decisionCommandId_key" ON "reward_requests"("decisionCommandId");
CREATE INDEX "reward_requests_householdId_requesterMemberId_state_idx" ON "reward_requests"("householdId", "requesterMemberId", "state");
