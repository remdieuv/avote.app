CREATE TABLE IF NOT EXISTS "AccountReportShareToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "fromDate" TIMESTAMP(3),
  "toDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountReportShareToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AccountReportShareToken_tokenHash_key"
  ON "AccountReportShareToken"("tokenHash");

CREATE INDEX IF NOT EXISTS "AccountReportShareToken_userId_createdAt_idx"
  ON "AccountReportShareToken"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "AccountReportShareToken_userId_revokedAt_expiresAt_idx"
  ON "AccountReportShareToken"("userId", "revokedAt", "expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'AccountReportShareToken_userId_fkey'
      AND table_name = 'AccountReportShareToken'
  ) THEN
    ALTER TABLE "AccountReportShareToken"
      ADD CONSTRAINT "AccountReportShareToken_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
