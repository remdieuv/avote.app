-- Lot F : invitations privées + protection médias souvenirs

ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "inviteEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "inviteCodeHash" TEXT;
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "inviteCodeUpdatedAt" TIMESTAMP(3);
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "mediaProtectionEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Event_inviteEnabled_idx" ON "Event"("inviteEnabled");

CREATE TABLE IF NOT EXISTS "EventGuestAccess" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventGuestAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EventGuestAccess_userId_eventId_key"
  ON "EventGuestAccess"("userId", "eventId");
CREATE INDEX IF NOT EXISTS "EventGuestAccess_userId_grantedAt_idx"
  ON "EventGuestAccess"("userId", "grantedAt");
CREATE INDEX IF NOT EXISTS "EventGuestAccess_eventId_idx"
  ON "EventGuestAccess"("eventId");

DO $$ BEGIN
  ALTER TABLE "EventGuestAccess"
    ADD CONSTRAINT "EventGuestAccess_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "EventGuestAccess"
    ADD CONSTRAINT "EventGuestAccess_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
