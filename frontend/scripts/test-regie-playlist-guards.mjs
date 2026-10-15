/**
 * Régie — guards UI playlist (↑↓ / Supprimer).
 * Exécution : node frontend/scripts/test-regie-playlist-guards.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getRegiePlaylistActionState,
  pollHasDiffusionHistory,
  previewPlaylistReorder,
} from "../lib/regiePlaylistGuards.js";

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

test("Verrouillé : pas de reorder ni delete", () => {
  const g = getRegiePlaylistActionState({
    isLocked: true,
    isLiveConsumed: false,
    isActivePoll: false,
    indexZeroBased: 1,
    totalPolls: 3,
    voteCount: 0,
    status: "DRAFT",
  });
  assert.equal(g.canReorderPlaylist, false);
  assert.equal(g.canMoveUp, false);
  assert.equal(g.canMoveDown, false);
  assert.equal(g.canDelete, false);
});

test("Milieu playlist : ↑ et ↓", () => {
  const g = getRegiePlaylistActionState({
    isLocked: false,
    isLiveConsumed: false,
    isActivePoll: false,
    indexZeroBased: 1,
    totalPolls: 3,
    voteCount: 0,
    status: "DRAFT",
  });
  assert.equal(g.canMoveUp, true);
  assert.equal(g.canMoveDown, true);
  assert.equal(g.canDelete, true);
});

test("Antenne : delete bloqué, reorder OK", () => {
  const g = getRegiePlaylistActionState({
    isLocked: false,
    isLiveConsumed: false,
    isActivePoll: true,
    indexZeroBased: 0,
    totalPolls: 3,
    voteCount: 0,
    status: "ACTIVE",
  });
  assert.equal(g.canDelete, false);
  assert.match(String(g.deleteBlockedReason), /antenne/i);
  assert.equal(g.canMoveDown, true);
  assert.equal(g.canMoveUp, false);
});

test("TEST + votes : wipe confirm", () => {
  const g = getRegiePlaylistActionState({
    isLocked: false,
    isLiveConsumed: false,
    isActivePoll: false,
    indexZeroBased: 2,
    totalPolls: 3,
    voteCount: 4,
    status: "CLOSED",
  });
  assert.equal(g.canDelete, true);
  assert.equal(g.requiresWipeConfirm, true);
  assert.match(String(g.deleteConfirmMessage), /remise à zéro/i);
});

test("RÉEL + historique CLOSED : delete bloqué", () => {
  assert.equal(pollHasDiffusionHistory({ status: "CLOSED" }), true);
  const g = getRegiePlaylistActionState({
    isLocked: false,
    isLiveConsumed: true,
    isActivePoll: false,
    indexZeroBased: 1,
    totalPolls: 2,
    voteCount: 0,
    status: "CLOSED",
  });
  assert.equal(g.canDelete, false);
  assert.match(String(g.deleteBlockedReason), /diffus/i);
});

test("RÉEL + DRAFT : delete OK", () => {
  const g = getRegiePlaylistActionState({
    isLocked: false,
    isLiveConsumed: true,
    isActivePoll: false,
    indexZeroBased: 1,
    totalPolls: 2,
    voteCount: 0,
    status: "DRAFT",
  });
  assert.equal(g.canDelete, true);
  assert.equal(g.requiresWipeConfirm, false);
});

test("previewPlaylistReorder", () => {
  const polls = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const up = previewPlaylistReorder(polls, "b", "up");
  assert.deepEqual(
    up.map((p) => p.id),
    ["b", "a", "c"],
  );
});

test("page.jsx branche ↑↓ / Supprimer", () => {
  const src = readFileSync(
    join(here, "../app/admin/event/[eventId]/page.jsx"),
    "utf8",
  );
  assert.ok(src.includes("getRegiePlaylistActionState"));
  assert.ok(src.includes("handlePlaylistMove"));
  assert.ok(src.includes("handlePlaylistDelete"));
  assert.ok(src.includes('onMoveUp={(id) => handlePlaylistMove(id, "up")}'));
  assert.ok(src.includes("confirmWipeTestData"));
  assert.ok(src.includes("Supprimer"));
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll regie playlist guard tests passed.");
