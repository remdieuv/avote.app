/**
 * Guards playlist — reorder / delete (TEST · RÉEL · verrouillé).
 * Exécution : node backend/scripts/test-playlist-poll-guards.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  pollHasDiffusionHistory,
  evaluatePlaylistReorderGuards,
  evaluatePlaylistDeleteGuards,
  computeReorderByDirection,
  validateFullPollOrder,
  buildContiguousOrderUpdates,
} = require("../lib/playlistPollGuards.js");

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

test("Reorder : verrouillé → 403", () => {
  const g = evaluatePlaylistReorderGuards({ isLocked: true });
  assert.equal(g.ok, false);
  assert.equal(g.status, 403);
});

test("Reorder : non verrouillé → OK", () => {
  const g = evaluatePlaylistReorderGuards({ isLocked: false });
  assert.equal(g.ok, true);
});

test("computeReorderByDirection ↑ ↓", () => {
  const ids = ["a", "b", "c"];
  const up = computeReorderByDirection(ids, "b", "up");
  assert.deepEqual(up.pollIds, ["b", "a", "c"]);
  const down = computeReorderByDirection(ids, "b", "down");
  assert.deepEqual(down.pollIds, ["a", "c", "b"]);
  const noop = computeReorderByDirection(ids, "a", "up");
  assert.deepEqual(noop.pollIds, ["a", "b", "c"]);
});

test("validateFullPollOrder refuse doublons / incomplets", () => {
  const cur = ["a", "b", "c"];
  assert.equal(validateFullPollOrder(cur, ["a", "b"]).ok, false);
  assert.equal(validateFullPollOrder(cur, ["a", "b", "b"]).ok, false);
  assert.equal(validateFullPollOrder(cur, ["a", "b", "x"]).ok, false);
  const ok = validateFullPollOrder(cur, ["c", "a", "b"]);
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.pollIds, ["c", "a", "b"]);
});

test("buildContiguousOrderUpdates 0..n-1", () => {
  assert.deepEqual(buildContiguousOrderUpdates(["x", "y", "z"]), [
    { id: "x", order: 0 },
    { id: "y", order: 1 },
    { id: "z", order: 2 },
  ]);
});

test("Delete : antenne → 409", () => {
  const g = evaluatePlaylistDeleteGuards({
    isLocked: false,
    isLiveConsumed: false,
    isActivePoll: true,
    voteCount: 0,
    status: "ACTIVE",
  });
  assert.equal(g.ok, false);
  assert.equal(g.status, 409);
  assert.match(String(g.error), /antenne/i);
});

test("Delete : TEST + votes sans confirm → requiresWipeConfirm", () => {
  const g = evaluatePlaylistDeleteGuards({
    isLocked: false,
    isLiveConsumed: false,
    isActivePoll: false,
    voteCount: 3,
    status: "CLOSED",
    confirmWipeTestData: false,
  });
  assert.equal(g.ok, false);
  assert.equal(g.requiresWipeConfirm, true);
  assert.match(String(g.error), /confirmWipeTestData|remise/i);
});

test("Delete : TEST + votes + confirm → OK", () => {
  const g = evaluatePlaylistDeleteGuards({
    isLocked: false,
    isLiveConsumed: false,
    isActivePoll: false,
    voteCount: 3,
    status: "CLOSED",
    confirmWipeTestData: true,
  });
  assert.equal(g.ok, true);
});

test("Delete : TEST + 0 vote → OK", () => {
  const g = evaluatePlaylistDeleteGuards({
    isLocked: false,
    isLiveConsumed: false,
    isActivePoll: false,
    voteCount: 0,
    status: "DRAFT",
  });
  assert.equal(g.ok, true);
});

test("Delete : RÉEL + votes → 409", () => {
  const g = evaluatePlaylistDeleteGuards({
    isLocked: false,
    isLiveConsumed: true,
    isActivePoll: false,
    voteCount: 2,
    status: "CLOSED",
  });
  assert.equal(g.ok, false);
  assert.equal(g.status, 409);
  assert.match(String(g.error), /réel/i);
});

test("Delete : RÉEL + CLOSED (historique) → 409", () => {
  assert.equal(pollHasDiffusionHistory({ status: "CLOSED", voteCount: 0 }), true);
  const g = evaluatePlaylistDeleteGuards({
    isLocked: false,
    isLiveConsumed: true,
    isActivePoll: false,
    voteCount: 0,
    status: "CLOSED",
  });
  assert.equal(g.ok, false);
  assert.match(String(g.error), /diffus/i);
});

test("Delete : RÉEL + DRAFT vierge → OK", () => {
  const g = evaluatePlaylistDeleteGuards({
    isLocked: false,
    isLiveConsumed: true,
    isActivePoll: false,
    voteCount: 0,
    status: "DRAFT",
  });
  assert.equal(g.ok, true);
});

test("Delete : verrouillé → 403", () => {
  const g = evaluatePlaylistDeleteGuards({
    isLocked: true,
    isLiveConsumed: true,
    isActivePoll: false,
    voteCount: 0,
    status: "DRAFT",
  });
  assert.equal(g.ok, false);
  assert.equal(g.status, 403);
});

test("server.js expose reorder + delete", () => {
  const src = readFileSync(join(here, "../server.js"), "utf8");
  assert.ok(src.includes('"/events/:eventId/polls/reorder"'));
  assert.ok(src.includes('app.delete("/polls/:pollId"'));
  assert.ok(src.includes("evaluatePlaylistDeleteGuards"));
  assert.ok(src.includes("applyEventPollsReorder"));
  assert.ok(src.includes("applyEventPollDelete"));
  assert.ok(src.includes("confirmWipeTestData"));
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll playlist poll guard tests passed.");
