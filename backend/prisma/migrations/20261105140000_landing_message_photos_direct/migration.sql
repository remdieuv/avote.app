-- Photos message-only : hors galerie publique (défaut = comportement actuel)

ALTER TABLE "EventLandingShowcasePhoto" ADD COLUMN IF NOT EXISTS "showInGallery" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "EventLandingShowcasePhoto_eventId_showInGallery_idx"
  ON "EventLandingShowcasePhoto"("eventId", "showInGallery");
