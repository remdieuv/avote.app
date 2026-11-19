-- Marqueur plan FREE pour l’offre gratuite permanente (Event.eventPlanType).
-- Additive : aucune ligne existante ni défaut participantsLimit (500) modifié.

ALTER TYPE "ActivationPlanType" ADD VALUE IF NOT EXISTS 'FREE';
