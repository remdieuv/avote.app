-- Default ON for NEW events only (does not backfill existing rows).
ALTER TABLE "Event" ALTER COLUMN "autoReveal" SET DEFAULT true;
