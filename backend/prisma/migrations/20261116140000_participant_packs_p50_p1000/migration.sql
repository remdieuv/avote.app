-- Remplace FUN/EVENT par les packs P50…P1000 (aucun achat réel en prod).
-- Aucune suppression de Vote / Event métier.

CREATE TYPE "ActivationPlanType_new" AS ENUM ('P50', 'P100', 'P250', 'P500', 'P1000');

ALTER TABLE "EventActivation"
  ALTER COLUMN "planType" DROP DEFAULT;

ALTER TABLE "EventActivation"
  ALTER COLUMN "planType" TYPE "ActivationPlanType_new"
  USING (
    CASE
      WHEN "planType"::text = 'FUN' THEN 'P100'::"ActivationPlanType_new"
      WHEN "planType"::text = 'EVENT' THEN 'P500'::"ActivationPlanType_new"
      WHEN "planType"::text IN ('P50', 'P100', 'P250', 'P500', 'P1000')
        THEN "planType"::text::"ActivationPlanType_new"
      ELSE 'P100'::"ActivationPlanType_new"
    END
  );

ALTER TABLE "Event"
  ALTER COLUMN "eventPlanType" TYPE "ActivationPlanType_new"
  USING (
    CASE
      WHEN "eventPlanType" IS NULL THEN NULL
      WHEN "eventPlanType"::text = 'FUN' THEN 'P100'::"ActivationPlanType_new"
      WHEN "eventPlanType"::text = 'EVENT' THEN 'P500'::"ActivationPlanType_new"
      WHEN "eventPlanType"::text IN ('P50', 'P100', 'P250', 'P500', 'P1000')
        THEN "eventPlanType"::text::"ActivationPlanType_new"
      ELSE 'P100'::"ActivationPlanType_new"
    END
  );

DROP TYPE "ActivationPlanType";
ALTER TYPE "ActivationPlanType_new" RENAME TO "ActivationPlanType";
