-- Lot D : profils organisateurs (Particulier / Organisation)

DO $$ BEGIN
  CREATE TYPE "OrganizerProfileType" AS ENUM ('PERSONAL', 'ORGANIZATION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "OrganizerProfile" (
  "id" TEXT NOT NULL,
  "ownerUserId" TEXT NOT NULL,
  "type" "OrganizerProfileType" NOT NULL,
  "slug" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "bio" TEXT,
  "imageUrl" TEXT,
  "websiteUrl" TEXT,
  "isPublic" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizerProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OrganizerProfile_slug_key" ON "OrganizerProfile"("slug");
CREATE INDEX IF NOT EXISTS "OrganizerProfile_ownerUserId_type_idx" ON "OrganizerProfile"("ownerUserId", "type");
CREATE INDEX IF NOT EXISTS "OrganizerProfile_isPublic_type_idx" ON "OrganizerProfile"("isPublic", "type");

DO $$ BEGIN
  ALTER TABLE "OrganizerProfile"
    ADD CONSTRAINT "OrganizerProfile_ownerUserId_fkey"
    FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "organizerProfileId" TEXT;

DO $$ BEGIN
  ALTER TABLE "Event"
    ADD CONSTRAINT "Event_organizerProfileId_fkey"
    FOREIGN KEY ("organizerProfileId") REFERENCES "OrganizerProfile"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Event_organizerProfileId_idx" ON "Event"("organizerProfileId");
