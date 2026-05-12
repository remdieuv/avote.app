-- Landing publique /e/[slug] — V1 (photos uniquement)

ALTER TABLE "Event" ADD COLUMN "landingEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN "landingCoverUrl" TEXT;
ALTER TABLE "Event" ADD COLUMN "landingTitle" TEXT;
ALTER TABLE "Event" ADD COLUMN "landingDescription" TEXT;

CREATE TABLE "EventLandingPhoto" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLandingPhoto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EventLandingPhoto_eventId_createdAt_idx" ON "EventLandingPhoto"("eventId", "createdAt");

ALTER TABLE "EventLandingPhoto" ADD CONSTRAINT "EventLandingPhoto_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
