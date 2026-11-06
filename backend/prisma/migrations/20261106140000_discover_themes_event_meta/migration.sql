-- Lot B : catalogue Theme + métadonnées Discover (city, startsAt, thèmes).
-- Aucune conversion des champs texte libres landingVenue / landingEventDate.

CREATE TABLE IF NOT EXISTS "Theme" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Theme_slug_key" ON "Theme"("slug");
CREATE INDEX IF NOT EXISTS "Theme_active_sortOrder_idx" ON "Theme"("active", "sortOrder");

-- Seed idempotent des 9 thèmes validés (IDs stables).
INSERT INTO "Theme" ("id", "slug", "label", "sortOrder", "active", "createdAt", "updatedAt")
VALUES
  ('theme_musique_festivals', 'musique-festivals', 'Musique & Festivals', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme_sport', 'sport', 'Sport', 20, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme_culture_spectacles', 'culture-spectacles', 'Culture & Spectacles', 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme_conferences_business', 'conferences-business', 'Conférences & Business', 40, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme_associations_solidarite', 'associations-solidarite', 'Associations & Solidarité', 50, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme_vie_locale_citoyennete', 'vie-locale-citoyennete', 'Vie locale & Citoyenneté', 60, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme_fetes_celebrations', 'fetes-celebrations', 'Fêtes & Célébrations', 70, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme_gaming_streaming', 'gaming-streaming', 'Gaming & Streaming', 80, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('theme_autres', 'autres', 'Autres', 90, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET
  "label" = EXCLUDED."label",
  "sortOrder" = EXCLUDED."sortOrder",
  "active" = EXCLUDED."active",
  "updatedAt" = CURRENT_TIMESTAMP;

ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "startsAt" TIMESTAMP(3);
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "primaryThemeId" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "secondaryThemeId" TEXT;

DO $$ BEGIN
  ALTER TABLE "Event"
    ADD CONSTRAINT "Event_primaryThemeId_fkey"
    FOREIGN KEY ("primaryThemeId") REFERENCES "Theme"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Event"
    ADD CONSTRAINT "Event_secondaryThemeId_fkey"
    FOREIGN KEY ("secondaryThemeId") REFERENCES "Theme"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "Event_visibility_startsAt_idx" ON "Event"("visibility", "startsAt");
CREATE INDEX IF NOT EXISTS "Event_visibility_city_idx" ON "Event"("visibility", "city");
CREATE INDEX IF NOT EXISTS "Event_primaryThemeId_idx" ON "Event"("primaryThemeId");
CREATE INDEX IF NOT EXISTS "Event_secondaryThemeId_idx" ON "Event"("secondaryThemeId");
