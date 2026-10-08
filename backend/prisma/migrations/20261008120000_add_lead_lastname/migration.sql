-- LOT-2 : prénom + initiale du nom pour affichage public Concours (optionnel).
ALTER TABLE "LeadCapture" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "ContestDrawWinner" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
