-- Compteur atomique de participants uniques (capacité vote sans FOR UPDATE Event global).
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "participantsUsed" INTEGER NOT NULL DEFAULT 0;

-- Backfill depuis les votes existants (distinct voterSessionId par événement).
UPDATE "Event" e
SET "participantsUsed" = COALESCE(sub.cnt, 0)
FROM (
  SELECT p."eventId" AS "eventId",
         COUNT(DISTINCT v."voterSessionId")::int AS cnt
  FROM "Vote" v
  INNER JOIN "Poll" p ON p."id" = v."pollId"
  GROUP BY p."eventId"
) AS sub
WHERE e."id" = sub."eventId";
