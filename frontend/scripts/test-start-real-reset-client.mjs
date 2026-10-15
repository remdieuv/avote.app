/**
 * Passage TEST → RÉEL — confirmation + clear marqueurs participant.
 * Exécution : node frontend/scripts/test-start-real-reset-client.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  clearParticipantRepetitionMarkers,
  getStartRealConfirmMessage,
  shouldClearParticipantMarkersOnStartReal,
  votedOptionsLocalStorageKey,
  votedPollLocalStorageKey,
} from "../lib/startRealResetClient.js";

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

test("Confirm FUN / EVENT : effacement explicite", () => {
  const fun = getStartRealConfirmMessage("FUN");
  const event = getStartRealConfirmMessage("EVENT");
  assert.match(fun, /FUN/);
  assert.match(event, /EVENT/);
  assert.match(fun, /supprimées définitivement/i);
  assert.match(fun, /votes/i);
  assert.match(fun, /question 1/i);
  assert.doesNotMatch(fun, /conservées/i);
});

test("Clear marqueurs seulement TEST → RÉEL", () => {
  assert.equal(
    shouldClearParticipantMarkersOnStartReal({
      wasTestMode: true,
      isLiveConsumedNow: true,
    }),
    true,
  );
  assert.equal(
    shouldClearParticipantMarkersOnStartReal({
      wasTestMode: false,
      isLiveConsumedNow: true,
    }),
    false,
    "déjà RÉEL / refresh : pas de clear",
  );
  assert.equal(
    shouldClearParticipantMarkersOnStartReal({
      wasTestMode: true,
      isLiveConsumedNow: false,
    }),
    false,
  );
});

test("clearParticipantRepetitionMarkers retire vote + lead keys", () => {
  /** @type {Record<string, string>} */
  const store = {
    [votedPollLocalStorageKey("p1")]: "true",
    [votedOptionsLocalStorageKey("p1")]: '["o1"]',
    avote_lead_draft_v1_p1_sess: "{}",
    avote_lead_submitted_v1_p1_sess: "1",
    other: "keep",
  };
  const ls = {
    removeItem(k) {
      delete store[k];
    },
  };
  const ss = {
    removeItem(k) {
      delete store[k];
    },
  };
  clearParticipantRepetitionMarkers({
    pollIds: ["p1"],
    voterSessionId: "sess",
    localStorage: /** @type {any} */ (ls),
    sessionStorage: /** @type {any} */ (ss),
    leadDraftKeyFn: (pollId, sid) => `avote_lead_draft_v1_${pollId}_${sid}`,
    leadSubmittedKeyFn: (pollId, sid) =>
      `avote_lead_submitted_v1_${pollId}_${sid}`,
  });
  assert.equal(store[votedPollLocalStorageKey("p1")], undefined);
  assert.equal(store[votedOptionsLocalStorageKey("p1")], undefined);
  assert.equal(store.avote_lead_draft_v1_p1_sess, undefined);
  assert.equal(store.avote_lead_submitted_v1_p1_sess, undefined);
  assert.equal(store.other, "keep");
});

test("Régie source : getStartRealConfirmMessage", () => {
  const src = readFileSync(
    join(here, "../app/admin/event/[eventId]/page.jsx"),
    "utf8",
  );
  assert.ok(src.includes("getStartRealConfirmMessage"));
  assert.equal(src.includes("données de la répétition (votes, leads, tirages) sont conservées"), false);
});

test("Join source : clear marqueurs au start-real", () => {
  const src = readFileSync(join(here, "../components/JoinLiveHub.jsx"), "utf8");
  assert.ok(src.includes("shouldClearParticipantMarkersOnStartReal"));
  assert.ok(src.includes("clearParticipantRepetitionMarkers"));
  assert.ok(src.includes("storageResetRevision"));
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests start-real-reset-client OK");
