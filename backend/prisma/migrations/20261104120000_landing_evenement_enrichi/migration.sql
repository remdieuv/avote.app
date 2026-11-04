-- Présentation ✨ L'événement + légendes photos (nullable = compatible événements existants)

ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "landingEventDate" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "landingVenue" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "landingHours" TEXT;

ALTER TABLE "EventLandingShowcasePhoto" ADD COLUMN IF NOT EXISTS "caption" TEXT;
ALTER TABLE "EventLandingPhoto" ADD COLUMN IF NOT EXISTS "caption" TEXT;

CREATE TABLE IF NOT EXISTS "EventLandingProgramItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "timeLabel" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventLandingProgramItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EventLandingProgramItem_eventId_sortOrder_createdAt_idx"
ON "EventLandingProgramItem"("eventId", "sortOrder", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EventLandingProgramItem_eventId_fkey'
  ) THEN
    ALTER TABLE "EventLandingProgramItem"
      ADD CONSTRAINT "EventLandingProgramItem_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES "Event"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
