-- Lot E : favoris événements + organisateurs suivis

CREATE TABLE IF NOT EXISTS "EventFavorite" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventFavorite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EventFavorite_userId_eventId_key"
  ON "EventFavorite"("userId", "eventId");
CREATE INDEX IF NOT EXISTS "EventFavorite_userId_createdAt_idx"
  ON "EventFavorite"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "EventFavorite_eventId_idx"
  ON "EventFavorite"("eventId");

DO $$ BEGIN
  ALTER TABLE "EventFavorite"
    ADD CONSTRAINT "EventFavorite_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EventFavorite"
    ADD CONSTRAINT "EventFavorite_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "OrganizerFollow" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "organizerProfileId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizerFollow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrganizerFollow_userId_organizerProfileId_key"
  ON "OrganizerFollow"("userId", "organizerProfileId");
CREATE INDEX IF NOT EXISTS "OrganizerFollow_userId_createdAt_idx"
  ON "OrganizerFollow"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "OrganizerFollow_organizerProfileId_idx"
  ON "OrganizerFollow"("organizerProfileId");

DO $$ BEGIN
  ALTER TABLE "OrganizerFollow"
    ADD CONSTRAINT "OrganizerFollow_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OrganizerFollow"
    ADD CONSTRAINT "OrganizerFollow_organizerProfileId_fkey"
    FOREIGN KEY ("organizerProfileId") REFERENCES "OrganizerProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
