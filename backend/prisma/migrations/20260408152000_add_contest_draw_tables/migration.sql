-- Contest draw audit trail (MVP)
CREATE TABLE "ContestDraw" (
  "id" TEXT NOT NULL,
  "pollId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "winnerCount" INTEGER NOT NULL DEFAULT 1,
  "eligibleCountAtDraw" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContestDraw_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContestDrawWinner" (
  "id" TEXT NOT NULL,
  "drawId" TEXT NOT NULL,
  "pollId" TEXT NOT NULL,
  "voterSessionId" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "firstName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContestDrawWinner_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContestDraw_pollId_createdAt_idx"
  ON "ContestDraw"("pollId", "createdAt");
CREATE INDEX "ContestDraw_eventId_createdAt_idx"
  ON "ContestDraw"("eventId", "createdAt");
CREATE INDEX "ContestDrawWinner_pollId_createdAt_idx"
  ON "ContestDrawWinner"("pollId", "createdAt");

CREATE UNIQUE INDEX "ContestDrawWinner_drawId_position_key"
  ON "ContestDrawWinner"("drawId", "position");
CREATE UNIQUE INDEX "ContestDrawWinner_pollId_voterSessionId_key"
  ON "ContestDrawWinner"("pollId", "voterSessionId");

ALTER TABLE "ContestDraw"
  ADD CONSTRAINT "ContestDraw_pollId_fkey"
  FOREIGN KEY ("pollId") REFERENCES "Poll"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContestDraw"
  ADD CONSTRAINT "ContestDraw_eventId_fkey"
  FOREIGN KEY ("eventId") REFERENCES "Event"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContestDraw"
  ADD CONSTRAINT "ContestDraw_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ContestDrawWinner"
  ADD CONSTRAINT "ContestDrawWinner_drawId_fkey"
  FOREIGN KEY ("drawId") REFERENCES "ContestDraw"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContestDrawWinner"
  ADD CONSTRAINT "ContestDrawWinner_pollId_fkey"
  FOREIGN KEY ("pollId") REFERENCES "Poll"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
