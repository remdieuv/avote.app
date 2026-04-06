-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('CREDENTIALS', 'GOOGLE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "provider" "AuthProvider" NOT NULL DEFAULT 'CREDENTIALS',
    "googleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- AlterTable Event: ownership (backfill puis NOT NULL)
ALTER TABLE "Event" ADD COLUMN "userId" TEXT;

INSERT INTO "User" ("id", "email", "passwordHash", "provider", "googleId", "createdAt", "updatedAt")
VALUES (
  'legacy_avote_owner',
  'legacy@avote.local',
  NULL,
  'CREDENTIALS',
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

UPDATE "Event" SET "userId" = 'legacy_avote_owner' WHERE "userId" IS NULL;

ALTER TABLE "Event" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "Event" ADD CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Event_userId_idx" ON "Event"("userId");
