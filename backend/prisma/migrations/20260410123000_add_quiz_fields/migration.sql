-- Quiz V1: mark correct option + reveal state
ALTER TABLE "Poll"
ADD COLUMN IF NOT EXISTS "quizRevealed" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "PollOption"
ADD COLUMN IF NOT EXISTS "isCorrect" BOOLEAN NOT NULL DEFAULT false;
