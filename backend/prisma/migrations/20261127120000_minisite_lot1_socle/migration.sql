-- Lot 1 — socle mini-site (additif, non destructif)
-- landingEnabled : défaut true pour les créations ; backfill true pour l’existant
-- (n’altère pas visibility PRIVATE, invites, Discover, ni médias).

ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "miniSiteShowKeyStats" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "miniSiteTabResults" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "miniSiteTabJournal" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "miniSiteTabGallery" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "miniSiteTabAbout" BOOLEAN NOT NULL DEFAULT false;

-- Défaut schéma pour les prochaines insertions
ALTER TABLE "Event" ALTER COLUMN "landingEnabled" SET DEFAULT true;

-- Compatibilité événements existants : mini-site disponible, onglets facultatifs off
UPDATE "Event" SET "landingEnabled" = true WHERE "landingEnabled" IS DISTINCT FROM true;
