CREATE TABLE "member_lifecycle_commands" (
    "commandId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "actorMemberId" TEXT NOT NULL,
    "targetMemberId" TEXT NOT NULL,
    "lifecycle" "MemberLifecycle" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "member_lifecycle_commands_pkey" PRIMARY KEY ("commandId"),
    CONSTRAINT "member_lifecycle_commands_id_check" CHECK (char_length("commandId") BETWEEN 1 AND 200 AND "commandId" !~ E'[\\r\\n]'),
    CONSTRAINT "member_lifecycle_commands_operation_check" CHECK ("lifecycle" IN ('suspended', 'removed'))
);

CREATE INDEX "member_lifecycle_commands_householdId_targetMemberId_createdAt_idx" ON "member_lifecycle_commands"("householdId", "targetMemberId", "createdAt");

ALTER TABLE "member_lifecycle_commands" ADD CONSTRAINT "member_lifecycle_commands_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "member_lifecycle_commands" ADD CONSTRAINT "member_lifecycle_commands_householdId_actorMemberId_fkey" FOREIGN KEY ("householdId", "actorMemberId") REFERENCES "members"("householdId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "member_lifecycle_commands" ADD CONSTRAINT "member_lifecycle_commands_householdId_targetMemberId_fkey" FOREIGN KEY ("householdId", "targetMemberId") REFERENCES "members"("householdId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
