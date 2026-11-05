-- V3 ✨ L'événement — message organisateur + remerciements (nullable = compatible existants)

ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "landingIntroTitle" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "landingIntroBody" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "landingIntroPhotoIds" JSONB;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "landingThanksTitle" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "landingThanksBody" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "landingThanksPhotoIds" JSONB;
