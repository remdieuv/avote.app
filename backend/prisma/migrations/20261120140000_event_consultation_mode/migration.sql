-- Libre-service étape 1 : mode de consultation Event (LIVE | SELF_SERVICE).
-- Additive : défaut LIVE = comportement historique pour toutes les lignes existantes.
-- selfServiceOpen : ouverture réversible (≠ isLocked).

DO $$ BEGIN
  CREATE TYPE "ConsultationMode" AS ENUM ('LIVE', 'SELF_SERVICE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "consultationMode" "ConsultationMode" NOT NULL DEFAULT 'LIVE';

ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "selfServiceOpen" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Event"
SET "consultationMode" = 'LIVE'
WHERE "consultationMode" IS NULL;

UPDATE "Event"
SET "selfServiceOpen" = false
WHERE "selfServiceOpen" IS NULL;
