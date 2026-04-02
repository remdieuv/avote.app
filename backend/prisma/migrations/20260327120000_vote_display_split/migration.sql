-- CreateEnum
CREATE TYPE "DisplayState" AS ENUM ('QUESTION', 'RESULTS', 'BLACK', 'WAITING');

-- CreateEnum
CREATE TYPE "VoteState" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "displayState" "DisplayState" NOT NULL DEFAULT 'WAITING';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "voteState" "VoteState" NOT NULL DEFAULT 'CLOSED';

-- Backfill from legacy liveState
UPDATE "Event" SET
  "voteState" = CASE WHEN "liveState"::text = 'VOTING' THEN 'OPEN'::"VoteState" ELSE 'CLOSED'::"VoteState" END,
  "displayState" = CASE
    WHEN "liveState"::text = 'RESULTS' THEN 'RESULTS'::"DisplayState"
    WHEN "liveState"::text = 'VOTING' THEN 'QUESTION'::"DisplayState"
    WHEN "liveState"::text = 'PAUSED' THEN 'BLACK'::"DisplayState"
    ELSE 'WAITING'::"DisplayState"
  END;
