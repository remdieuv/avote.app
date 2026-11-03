-- Landing hybride V1 : fil (messages, likes, hide résultats, rétention après)

ALTER TABLE "Event" ADD COLUMN "landingKeepPhotosAfter" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Event" ADD COLUMN "landingKeepResultsAfter" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Event" ADD COLUMN "landingKeepMessagesAfter" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Poll" ADD COLUMN "landingResultHidden" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "EventLandingMessage" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventLandingMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EventLandingMessage_eventId_createdAt_idx" ON "EventLandingMessage"("eventId", "createdAt");
CREATE INDEX "EventLandingMessage_eventId_hidden_createdAt_idx" ON "EventLandingMessage"("eventId", "hidden", "createdAt");

ALTER TABLE "EventLandingMessage" ADD CONSTRAINT "EventLandingMessage_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventLandingMessage" ADD CONSTRAINT "EventLandingMessage_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "EventLandingPhotoLike" (
    "id" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLandingPhotoLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventLandingPhotoLike_photoId_visitorKey_key" ON "EventLandingPhotoLike"("photoId", "visitorKey");
CREATE INDEX "EventLandingPhotoLike_photoId_idx" ON "EventLandingPhotoLike"("photoId");

ALTER TABLE "EventLandingPhotoLike" ADD CONSTRAINT "EventLandingPhotoLike_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "EventLandingPhoto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
