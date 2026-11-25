-- Sélection Libre-service indépendante des status LIVE (ACTIVE/CLOSED).
-- Additive : pas de DROP / DELETE votes.

ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "selfServiceSelectedPollIds" JSONB NOT NULL DEFAULT '[]'::jsonb;
