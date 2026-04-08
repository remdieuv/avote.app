-- Add new PollType enum value for contest participation questions
ALTER TYPE "PollType" ADD VALUE IF NOT EXISTS 'CONTEST_ENTRY';
