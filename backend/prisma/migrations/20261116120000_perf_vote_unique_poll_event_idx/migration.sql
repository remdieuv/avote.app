-- Étape 1 perf : index Poll(eventId) + unique Vote(pollId, voterSessionId, optionId).
-- Aucune suppression automatique de données : si des doublons existent, la migration échoue.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Vote"
    GROUP BY "pollId", "voterSessionId", "optionId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION
      'AVOTE_VOTE_DUPLICATES: des lignes Vote en double (pollId, voterSessionId, optionId) existent. Résoudre manuellement avant de créer l''index unique — aucune suppression automatique.';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Poll_eventId_idx" ON "Poll"("eventId");

CREATE UNIQUE INDEX IF NOT EXISTS "Vote_pollId_voterSessionId_optionId_key"
  ON "Vote"("pollId", "voterSessionId", "optionId");
