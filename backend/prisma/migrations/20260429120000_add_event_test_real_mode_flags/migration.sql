-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "isLiveConsumed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consumedAt" TIMESTAMP(3),
ADD COLUMN     "isLocked" BOOLEAN NOT NULL DEFAULT false;

