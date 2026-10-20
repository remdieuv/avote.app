-- L1 formulaires Lead/Concours : colonnes additives + nullability + backfill contact_legacy.
-- Expand-only : aucune suppression de données.
-- NE PAS exécuter sur la production depuis cet agent sans go explicite Rémi.

-- Poll : définition de formulaire
ALTER TABLE "Poll" ADD COLUMN IF NOT EXISTS "formDefinition" JSONB;
ALTER TABLE "Poll" ADD COLUMN IF NOT EXISTS "formTemplateKey" TEXT;
ALTER TABLE "Poll" ADD COLUMN IF NOT EXISTS "formSchemaVersion" INTEGER NOT NULL DEFAULT 1;

-- LeadCapture : réponses + consentements + nullability contact
ALTER TABLE "LeadCapture" ADD COLUMN IF NOT EXISTS "answers" JSONB;
ALTER TABLE "LeadCapture" ADD COLUMN IF NOT EXISTS "schemaVersion" INTEGER;
ALTER TABLE "LeadCapture" ADD COLUMN IF NOT EXISTS "consents" JSONB;

ALTER TABLE "LeadCapture" ALTER COLUMN "firstName" DROP NOT NULL;
ALTER TABLE "LeadCapture" ALTER COLUMN "phone" DROP NOT NULL;

-- Concours gagnants : téléphone optionnel (email-only D2)
ALTER TABLE "ContestDrawWinner" ALTER COLUMN "phone" DROP NOT NULL;

-- Backfill polls Lead/Concours existants → contact_legacy (miroir formulaire figé)
UPDATE "Poll"
SET
  "formTemplateKey" = 'contact_legacy',
  "formSchemaVersion" = 1,
  "formDefinition" = '{"version":1,"templateKey":"contact_legacy","title":"Formulaire de contact","rules":{"requireFirstName":false,"requireEmailOrPhone":false},"fields":[{"id":"fld_firstName","type":"short_text","label":"Prénom","required":true,"order":0,"placeholder":"","options":[],"slot":"firstName"},{"id":"fld_lastName","type":"short_text","label":"Nom","required":false,"order":1,"placeholder":"","options":[],"slot":"lastName"},{"id":"fld_phone","type":"phone","label":"Téléphone","required":true,"order":2,"placeholder":"","options":[],"slot":"phone"},{"id":"fld_email","type":"email","label":"Email","required":false,"order":3,"placeholder":"","options":[],"slot":"email"}]}'::jsonb
WHERE "leadEnabled" = true
  AND "formDefinition" IS NULL;

-- Backfill answers depuis colonnes legacy (idempotent)
UPDATE "LeadCapture"
SET
  "schemaVersion" = 1,
  "answers" = jsonb_strip_nulls(
    jsonb_build_object(
      'fld_firstName', to_jsonb("firstName"),
      'fld_lastName', to_jsonb("lastName"),
      'fld_phone', to_jsonb("phone"),
      'fld_email', to_jsonb("email")
    )
  )
WHERE "answers" IS NULL;
