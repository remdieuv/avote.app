-- Lot A : visibilité Public / Privé (Discover + SEO).
-- Backfill PRIVATE : hors annuaire futur ; Landing /join inchangés (pas de gate souvenirs).

DO $$ BEGIN
  CREATE TYPE "EventVisibility" AS ENUM ('PRIVATE', 'PUBLIC');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "visibility" "EventVisibility" NOT NULL DEFAULT 'PRIVATE';

UPDATE "Event" SET "visibility" = 'PRIVATE' WHERE "visibility" IS NULL;

CREATE INDEX IF NOT EXISTS "Event_visibility_idx" ON "Event"("visibility");
