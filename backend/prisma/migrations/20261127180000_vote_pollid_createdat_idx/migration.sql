-- Lot 2 : index Vote(pollId, createdAt) pour l’historique résultats (approche A).
-- Non redondant avec Vote_pollId_idx / Vote_pollId_voterSessionId_idx (pas de createdAt).

CREATE INDEX IF NOT EXISTS "Vote_pollId_createdAt_idx" ON "Vote"("pollId", "createdAt");
