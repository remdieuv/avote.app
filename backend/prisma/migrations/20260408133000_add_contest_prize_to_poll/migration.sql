-- Add explicit contest prize text for contest-entry polls
ALTER TABLE "Poll" ADD COLUMN "contestPrize" TEXT;
