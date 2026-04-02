-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "questionTimerAccumulatedSec" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "questionTimerIsPaused" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "questionTimerStartedAt" TIMESTAMP(3),
ADD COLUMN     "questionTimerTotalSec" INTEGER;
