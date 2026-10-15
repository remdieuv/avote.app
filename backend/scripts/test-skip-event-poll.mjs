/**
 * « Passer cette question » — guards + playlist.
 * Exécution : node backend/scripts/test-skip-event-poll.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  resolveSkipPollPlaylist,
  evaluateSkipPollGuards,
  isContestQuotaReached,
  isContestPoll,
} = require("../lib/skipEventPoll.js");

const here = dirname(fileURLToPath(import.meta.url));
let failed = 0;

/** @param {string} name @param {() => void} fn */
function test(name, fn) {
  try {
    fn();
    console.log(`ok — ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`FAIL — ${name}`);
    console.error(e);
  }
}

const polls = [
  { id: "q1", order: 0, status: "CLOSED", type: "SINGLE_CHOICE" },
  { id: "q2", order: 1, status: "ACTIVE", type: "QUIZ" },
  { id: "q3", order: 2, status: "DRAFT", type: "CONTEST_ENTRY" },
  { id: "qx", order: 3, status: "ARCHIVED", type: "LEAD" },
];

test("resolveSkipPollPlaylist ignore ARCHIVED + next", () => {
  const r = resolveSkipPollPlaylist(polls, "q2");
  assert.equal(r.hasActive, true);
  assert.equal(r.hasNext, true);
  assert.equal(r.nextPoll?.id, "q3");
  assert.equal(r.isLast, false);
  assert.equal(r.playable.length, 3);
});

test("resolveSkipPollPlaylist dernière question", () => {
  const r = resolveSkipPollPlaylist(polls, "q3");
  assert.equal(r.hasNext, false);
  assert.equal(r.isLast, true);
});

test("Guards : verrouillé → 403", () => {
  const g = evaluateSkipPollGuards({
    isLocked: true,
    hasActivePoll: true,
    hasNextPoll: true,
  });
  assert.equal(g.ok, false);
  assert.equal(g.status, 403);
  assert.equal(g.code, "EVENT_LOCKED");
});

test("Guards : dernière → LAST_QUESTION", () => {
  const g = evaluateSkipPollGuards({
    isLocked: false,
    hasActivePoll: true,
    hasNextPoll: false,
  });
  assert.equal(g.ok, false);
  assert.equal(g.code, "LAST_QUESTION");
  assert.equal(g.requiresFinish, true);
});

test("Guards : vote ouvert sans confirm → 409", () => {
  const g = evaluateSkipPollGuards({
    isLocked: false,
    hasActivePoll: true,
    hasNextPoll: true,
    voteState: "open",
    confirmOpenVote: false,
  });
  assert.equal(g.ok, false);
  assert.equal(g.code, "CONFIRM_OPEN_VOTE");
  assert.equal(g.needsConfirmOpenVote, true);
});

test("Guards : vote ouvert + confirm → OK", () => {
  const g = evaluateSkipPollGuards({
    isLocked: false,
    hasActivePoll: true,
    hasNextPoll: true,
    voteState: "open",
    confirmOpenVote: true,
  });
  assert.equal(g.ok, true);
});

test("Guards : concours sans tirage sans confirm → 409", () => {
  const g = evaluateSkipPollGuards({
    isLocked: false,
    hasActivePoll: true,
    hasNextPoll: true,
    voteState: "closed",
    isContest: true,
    contestQuotaReached: false,
    confirmAbandonDraw: false,
  });
  assert.equal(g.ok, false);
  assert.equal(g.code, "CONFIRM_ABANDON_DRAW");
});

test("Guards : concours quota atteint → OK sans confirm draw", () => {
  const g = evaluateSkipPollGuards({
    isLocked: false,
    hasActivePoll: true,
    hasNextPoll: true,
    isContest: true,
    contestQuotaReached: true,
    confirmAbandonDraw: false,
  });
  assert.equal(g.ok, true);
});

test("isContestQuotaReached + isContestPoll", () => {
  assert.equal(isContestPoll({ type: "CONTEST_ENTRY" }), true);
  assert.equal(isContestPoll({ type: "QUIZ" }), false);
  assert.equal(
    isContestQuotaReached({ contestWinnerCount: 2, totalWinners: 1 }),
    false,
  );
  assert.equal(
    isContestQuotaReached({ contestWinnerCount: 2, totalWinners: 2 }),
    true,
  );
});

test("server.js : skip-poll réutilise passerAuSondageSuivant", () => {
  const src = readFileSync(join(here, "../server.js"), "utf8");
  assert.ok(src.includes('"/events/:eventId/skip-poll"'));
  assert.ok(src.includes("evaluateSkipPollGuards"));
  assert.ok(src.includes("passerAuSondageSuivant(eventId)"));
  assert.ok(src.includes("votesPreserved: true"));
  assert.ok(src.includes("winnersCreated: false"));
  assert.ok(src.includes("confirmOpenVote"));
  assert.ok(src.includes("confirmAbandonDraw"));
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll skip-event-poll tests passed.");
