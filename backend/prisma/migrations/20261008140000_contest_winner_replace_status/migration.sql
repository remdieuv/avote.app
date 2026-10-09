-- LOT-2 : remplacement de gagnant (historique non destructif).
-- Additive only — pas de DROP / pas de réécriture des gagnants existants.

DO $$ BEGIN
  CREATE TYPE "ContestWinnerStatus" AS ENUM ('ACTIVE', 'REPLACED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "ContestDrawWinner"
  ADD COLUMN IF NOT EXISTS "status" "ContestWinnerStatus" NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE "ContestDrawWinner"
  ADD COLUMN IF NOT EXISTS "replacedAt" TIMESTAMP(3);

ALTER TABLE "ContestDrawWinner"
  ADD COLUMN IF NOT EXISTS "replacedByWinnerId" TEXT;

CREATE INDEX IF NOT EXISTS "ContestDrawWinner_pollId_status_idx"
  ON "ContestDrawWinner"("pollId", "status");
