CREATE TYPE "NotificationEnvelopeState" AS ENUM ('scheduled', 'available', 'read', 'dismissed', 'cancelled', 'failed');

CREATE TABLE "notification_envelopes" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "recipientMemberId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sourceEventId" TEXT NOT NULL,
    "references" JSONB NOT NULL,
    "deduplicationKey" TEXT NOT NULL,
    "deliverAt" TIMESTAMP(3) NOT NULL,
    "state" "NotificationEnvelopeState" NOT NULL DEFAULT 'scheduled',
    "deepLink" TEXT,
    "readAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "notification_envelopes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_envelopes_deduplicationKey_key" ON "notification_envelopes"("deduplicationKey");
CREATE INDEX "notification_envelopes_householdId_recipientMemberId_state__idx" ON "notification_envelopes"("householdId", "recipientMemberId", "state", "deliverAt");
ALTER TABLE "notification_envelopes" ADD CONSTRAINT "notification_envelopes_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_envelopes" ADD CONSTRAINT "notification_envelopes_recipientMemberId_fkey" FOREIGN KEY ("recipientMemberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
