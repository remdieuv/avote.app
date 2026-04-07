-- AlterTable
ALTER TABLE "Poll"
ADD COLUMN "leadEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "leadTriggerOptionId" TEXT;

-- CreateTable
CREATE TABLE "LeadCapture" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "voterSessionId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadCapture_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "LeadCapture_eventId_createdAt_idx" ON "LeadCapture"("eventId", "createdAt");
CREATE INDEX "LeadCapture_pollId_createdAt_idx" ON "LeadCapture"("pollId", "createdAt");
CREATE UNIQUE INDEX "LeadCapture_pollId_voterSessionId_key" ON "LeadCapture"("pollId", "voterSessionId");

-- Foreign keys
ALTER TABLE "LeadCapture"
ADD CONSTRAINT "LeadCapture_eventId_fkey"
FOREIGN KEY ("eventId") REFERENCES "Event"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadCapture"
ADD CONSTRAINT "LeadCapture_pollId_fkey"
FOREIGN KEY ("pollId") REFERENCES "Poll"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
