-- Galerie « événement » (teaser) séparée des photos « moments live ».

CREATE TABLE "EventLandingShowcasePhoto" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLandingShowcasePhoto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EventLandingShowcasePhoto_eventId_createdAt_idx" ON "EventLandingShowcasePhoto"("eventId", "createdAt");

ALTER TABLE "EventLandingShowcasePhoto" ADD CONSTRAINT "EventLandingShowcasePhoto_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
