/**
 * LOT-1 / LOT-7 — Salle `/join` permanente + Page événement + FULL/OFFLINE.
 * Exécution : node frontend/scripts/test-participant-live-flow.mjs
 */
import assert from "node:assert/strict";
import {
  LIVE_UX_STATE,
  resolveLiveUxState,
} from "../lib/liveStateUx.js";
import {
  PARTICIPANT_CONTEST_NOTICE,
  PARTICIPANT_LEAD_NOTICE,
  extractParticipantErrorCode,
  getParticipantFormNotice,
  getParticipantFullLabel,
  getParticipantOfflineLabel,
  isParticipantRoomFull,
  resolveEventLandingPhase,
  shouldAutoNavigateJoinToPollPath,
  shouldEmbedPollSurfaceInRoom,
} from "../lib/participantLiveFlow.js";

/** @type {{ name: string; run: () => void }[]} */
const cases = [];

function test(name, run) {
  cases.push({ name, run });
}

// A — scan → conceptuellement /join (embed off en WAITING)
test("A/B. WAITING → reste Salle, pas d’embed vote", () => {
  const ux = resolveLiveUxState({
    liveScene: "waiting",
    displayState: "waiting",
    voteState: "closed",
    pollStatus: null,
    hasActivePoll: false,
  });
  assert.equal(ux, LIVE_UX_STATE.WAITING);
  assert.equal(shouldEmbedPollSurfaceInRoom({ uxState: ux }), false);
  assert.equal(shouldAutoNavigateJoinToPollPath(), false);
});

// C — VOTING → embed dans /join, jamais nav /p
test("C. VOTING → embed dans Salle, aucune auto-nav /p", () => {
  const ux = resolveLiveUxState({
    liveScene: "voting",
    displayState: "question",
    voteState: "open",
    pollStatus: "ACTIVE",
    hasActivePoll: true,
  });
  assert.equal(ux, LIVE_UX_STATE.VOTING);
  assert.equal(shouldEmbedPollSurfaceInRoom({ uxState: ux }), true);
  assert.equal(shouldAutoNavigateJoinToPollPath(), false);
});

// D/E — confirmation reste en VOTING embed (déjà voté côté UI)
test("D/E. VOTING (confirm) → toujours embed Salle", () => {
  assert.equal(
    shouldEmbedPollSurfaceInRoom({ uxState: LIVE_UX_STATE.VOTING }),
    true,
  );
  assert.equal(shouldAutoNavigateJoinToPollPath(), false);
});

// F — CLOSED sans résultats, reste /join
test("F. CLOSED → embed Salle, pas RESULTS", () => {
  const ux = resolveLiveUxState({
    liveScene: "waiting",
    displayState: "question",
    voteState: "closed",
    pollStatus: "CLOSED",
    hasActivePoll: true,
  });
  assert.equal(ux, LIVE_UX_STATE.CLOSED);
  assert.equal(shouldEmbedPollSurfaceInRoom({ uxState: ux }), true);
  assert.notEqual(ux, LIVE_UX_STATE.RESULTS);
  assert.equal(shouldAutoNavigateJoinToPollPath(), false);
});

// G — RESULTS dans /join
test("G. RESULTS → embed Salle (résultats dans /join)", () => {
  const ux = resolveLiveUxState({
    liveScene: "results",
    displayState: "results",
    voteState: "closed",
    pollStatus: "CLOSED",
    hasActivePoll: true,
  });
  assert.equal(ux, LIVE_UX_STATE.RESULTS);
  assert.equal(shouldEmbedPollSurfaceInRoom({ uxState: ux }), true);
  assert.equal(shouldAutoNavigateJoinToPollPath(), false);
});

// H — question suivante WAITING puis VOTING
test("H. WAITING puis VOTING → Salle puis embed, jamais /p", () => {
  assert.equal(
    shouldEmbedPollSurfaceInRoom({ uxState: LIVE_UX_STATE.WAITING }),
    false,
  );
  assert.equal(
    shouldEmbedPollSurfaceInRoom({ uxState: LIVE_UX_STATE.VOTING }),
    true,
  );
  assert.equal(shouldAutoNavigateJoinToPollPath(), false);
});

// I — FINISHED dans /join (corps Salle, pas embed)
test("I. FINISHED → reste Salle, pas embed vote", () => {
  const ux = resolveLiveUxState({
    liveScene: "finished",
    displayState: "waiting",
    voteState: "closed",
    pollStatus: null,
    hasActivePoll: false,
  });
  assert.equal(ux, LIVE_UX_STATE.FINISHED);
  assert.equal(shouldEmbedPollSurfaceInRoom({ uxState: ux }), false);
  assert.equal(shouldAutoNavigateJoinToPollPath(), false);
});

// J — aucune navigation automatique join→p
test("J. shouldAutoNavigateJoinToPollPath toujours false", () => {
  assert.equal(shouldAutoNavigateJoinToPollPath(), false);
});

// K — /p direct : helper n’interdit pas l’usage standalone (contrat)
test("K. /p direct non concerné par embed Salle", () => {
  // L’embed ne s’applique qu’à Join ; /p reste PollExperience standalone.
  assert.equal(
    typeof shouldEmbedPollSurfaceInRoom({ uxState: LIVE_UX_STATE.VOTING }),
    "boolean",
  );
});

// L — LOT-0 CLOSED ≠ RESULTS (rappel)
test("L. LOT-0 CLOSED ≠ RESULTS", () => {
  assert.equal(
    resolveLiveUxState({
      liveScene: "waiting",
      displayState: "question",
      voteState: "closed",
      pollStatus: "CLOSED",
      hasActivePoll: true,
    }),
    LIVE_UX_STATE.CLOSED,
  );
});

// M — Page événement
test("M. Page événement avant / pendant / après", () => {
  assert.equal(
    resolveEventLandingPhase({
      liveState: "waiting",
      voteState: "closed",
      displayState: "waiting",
    }),
    "before",
  );
  assert.equal(
    resolveEventLandingPhase({
      liveState: "voting",
      voteState: "open",
      displayState: "question",
    }),
    "during",
  );
  assert.equal(resolveEventLandingPhase({ liveState: "finished" }), "after");
});

test("PAUSED → Salle sans embed vote", () => {
  assert.equal(
    shouldEmbedPollSurfaceInRoom({ uxState: LIVE_UX_STATE.PAUSED }),
    false,
  );
});

test("FULL bloque embed", () => {
  assert.equal(
    shouldEmbedPollSurfaceInRoom({
      uxState: LIVE_UX_STATE.VOTING,
      isFull: true,
    }),
    false,
  );
  assert.equal(isParticipantRoomFull({ isLocked: true }), true);
  assert.equal(extractParticipantErrorCode("LIMIT_REACHED"), "LIMIT_REACHED");
  assert.equal(getParticipantFullLabel(), "La salle est complète.");
});

test("OFFLINE libellé + préavis types", () => {
  assert.equal(getParticipantOfflineLabel(), "Connexion interrompue.");
  assert.equal(
    getParticipantFormNotice({ leadEnabled: true }),
    PARTICIPANT_LEAD_NOTICE,
  );
  assert.equal(
    getParticipantFormNotice({ pollType: "CONTEST_ENTRY" }),
    PARTICIPANT_CONTEST_NOTICE,
  );
  assert.equal(getParticipantFormNotice({ pollType: "SINGLE_CHOICE" }), null);
  assert.equal(getParticipantFormNotice({ pollType: "QUIZ" }), null);
  assert.equal(
    getParticipantFormNotice({ pollType: "MULTIPLE_CHOICE" }),
    null,
  );
});

let failed = 0;
for (const c of cases) {
  try {
    c.run();
    console.log(`ok — ${c.name}`);
  } catch (e) {
    failed += 1;
    console.error(`FAIL — ${c.name}`);
    console.error(e);
  }
}

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log(`\n${cases.length} tests participant OK (Salle permanente)`);
