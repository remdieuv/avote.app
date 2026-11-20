-- Aligne la DB sur schema.prisma : User.role (défaut USER).
-- Additive : aucune suppression / UPDATE de lignes métier.
-- IF NOT EXISTS : no-op sûr si la colonne existe déjà (ex. prod alignée hors migrate).

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'USER';
