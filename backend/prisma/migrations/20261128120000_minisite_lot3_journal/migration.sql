-- Lot 3 : actualités Journal — titre + image optionnels sur EventLandingMessage.
-- Expand-only ; messages existants restent valides (title/imageUrl NULL).

ALTER TABLE "EventLandingMessage" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "EventLandingMessage" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
