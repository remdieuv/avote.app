/**
 * LOT-1 / LOT-7 — continuum participant + Page événement + FULL/OFFLINE.
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
  shouldAutoEnterResultsSurface,
  shouldAutoEnterVoteSurface,
} from "../lib/participantLiveFlow.js";

/** @type {{ name: string; run: () => void }[]} */
const cases = [];

function test(name, run) {
  cases.push({ name, run });
}

// A — arrivée avant ouverture → WAITING (Salle)
test("A. WAITING hors vote → pas d’auto-entrée vote", () => {
  const ux = resolveLiveUxState({
    liveScene: "waiting",
    displayState: "waiting",
    voteState: "closed",
    pollStatus: null,
    hasActivePoll: false,
  });
  assert.equal(ux, LIVE_UX_STATE.WAITING);
  assert.equal(
    shouldAutoEnterVoteSurface({
      uxState: ux,
      hasVoted: false,
      storageReady: true,
    }),
    false,
  );
});

// B — ouverture question → auto sans CTA
test("B. VOTING non voté → auto-entrée surface vote", () => {
  const ux = resolveLiveUxState({
    liveScene: "voting",
    displayState: "question",
    voteState: "open",
    pollStatus: "ACTIVE",
    hasActivePoll: true,
  });
  assert.equal(ux, LIVE_UX_STATE.VOTING);
  assert.equal(
    shouldAutoEnterVoteSurface({
      uxState: ux,
      hasVoted: false,
      storageReady: true,
    }),
    true,
  );
});

// C — arrivée pendant VOTING
test("C. arrivée mid-VOTING → participation immédiate (auto)", () => {
  assert.equal(
    shouldAutoEnterVoteSurface({
      uxState: LIVE_UX_STATE.VOTING,
      hasVoted: false,
      storageReady: true,
      loading: false,
    }),
    true,
  );
});

// D — déjà voté → pas de re-hop vote
test("D. VOTING déjà voté → pas d’auto-entrée (confirmation Salle)", () => {
  assert.equal(
    shouldAutoEnterVoteSurface({
      uxState: LIVE_UX_STATE.VOTING,
      hasVoted: true,
      storageReady: true,
    }),
    false,
  );
});

// E — CLOSED sans résultats
test("E. CLOSED ≠ RESULTS", () => {
  const ux = resolveLiveUxState({
    liveScene: "waiting",
    displayState: "question",
    voteState: "closed",
    pollStatus: "CLOSED",
    hasActivePoll: true,
  });
  assert.equal(ux, LIVE_UX_STATE.CLOSED);
  assert.equal(
    shouldAutoEnterResultsSurface({
      uxState: ux,
      hasActivePoll: true,
    }),
    false,
  );
});

// F — RESULTS
test("F. RESULTS → auto surface résultats si poll actif", () => {
  const ux = resolveLiveUxState({
    liveScene: "results",
    displayState: "results",
    voteState: "closed",
    pollStatus: "CLOSED",
    hasActivePoll: true,
  });
  assert.equal(ux, LIVE_UX_STATE.RESULTS);
  assert.equal(
    shouldAutoEnterResultsSurface({
      uxState: ux,
      hasActivePoll: true,
    }),
    true,
  );
});

// G — question suivante = WAITING puis VOTING
test("G. idle puis VOTING → transition auto", () => {
  assert.equal(
    shouldAutoEnterVoteSurface({
      uxState: LIVE_UX_STATE.WAITING,
      hasVoted: false,
      storageReady: true,
    }),
    false,
  );
  assert.equal(
    shouldAutoEnterVoteSurface({
      uxState: LIVE_UX_STATE.VOTING,
      hasVoted: false,
      storageReady: true,
    }),
    true,
  );
});

// H — FINISHED
test("H. FINISHED → pas d’auto vote", () => {
  const ux = resolveLiveUxState({
    liveScene: "finished",
    displayState: "waiting",
    voteState: "closed",
    pollStatus: null,
    hasActivePoll: false,
  });
  assert.equal(ux, LIVE_UX_STATE.FINISHED);
  assert.equal(
    shouldAutoEnterVoteSurface({ uxState: ux, hasVoted: false, storageReady: true }),
    false,
  );
});

// I — FULL
test("I. FULL / isLocked / LIMIT_REACHED", () => {
  assert.equal(isParticipantRoomFull({ isLocked: true }), true);
  assert.equal(isParticipantRoomFull({ limitReached: true }), true);
  assert.equal(extractParticipantErrorCode("LIMIT_REACHED"), "LIMIT_REACHED");
  assert.equal(extractParticipantErrorCode({ error: "EVENT_LOCKED" }), "EVENT_LOCKED");
  assert.equal(getParticipantFullLabel(), "La salle est complète.");
  assert.equal(
    shouldAutoEnterVoteSurface({
      uxState: LIVE_UX_STATE.VOTING,
      hasVoted: false,
      isFull: true,
      storageReady: true,
    }),
    false,
  );
});

// J — OFFLINE
test("J. OFFLINE bloque auto-entrée + libellé", () => {
  assert.equal(getParticipantOfflineLabel(), "Connexion interrompue.");
  assert.equal(
    shouldAutoEnterVoteSurface({
      uxState: LIVE_UX_STATE.VOTING,
      hasVoted: false,
      offline: true,
      storageReady: true,
    }),
    false,
  );
});

// K — storage pas prêt
test("K. storage pas prêt → pas d’auto (évite double vote hop)", () => {
  assert.equal(
    shouldAutoEnterVoteSurface({
      uxState: LIVE_UX_STATE.VOTING,
      hasVoted: false,
      storageReady: false,
    }),
    false,
  );
});

// L — types lead / concours préavis
test("L. préavis LEAD et CONTEST_ENTRY", () => {
  assert.equal(
    getParticipantFormNotice({ leadEnabled: true }),
    PARTICIPANT_LEAD_NOTICE,
  );
  assert.equal(
    getParticipantFormNotice({ pollType: "CONTEST_ENTRY" }),
    PARTICIPANT_CONTEST_NOTICE,
  );
  assert.equal(
    getParticipantFormNotice({ pollType: "SINGLE_CHOICE", leadEnabled: false }),
    null,
  );
  assert.equal(
    getParticipantFormNotice({ pollType: "QUIZ" }),
    null,
  );
  assert.equal(
    getParticipantFormNotice({ pollType: "MULTIPLE_CHOICE" }),
    null,
  );
});

// M — Page événement phases
test("M. Page événement avant / pendant / après", () => {
  assert.equal(
    resolveEventLandingPhase({ liveState: "waiting", voteState: "closed", displayState: "waiting" }),
    "before",
  );
  assert.equal(
    resolveEventLandingPhase({ liveState: "voting", voteState: "open", displayState: "question" }),
    "during",
  );
  assert.equal(
    resolveEventLandingPhase({ liveState: "waiting", voteState: "closed", displayState: "question" }),
    "during",
  );
  assert.equal(
    resolveEventLandingPhase({ liveState: "results", displayState: "results" }),
    "during",
  );
  assert.equal(
    resolveEventLandingPhase({ liveState: "finished" }),
    "after",
  );
  assert.equal(
    resolveEventLandingPhase({ liveState: "paused", displayState: "black" }),
    "during",
  );
});

test("preview iframe / loading bloquent auto", () => {
  assert.equal(
    shouldAutoEnterVoteSurface({
      uxState: LIVE_UX_STATE.VOTING,
      hasVoted: false,
      storageReady: true,
      inPreviewFrame: true,
    }),
    false,
  );
  assert.equal(
    shouldAutoEnterVoteSurface({
      uxState: LIVE_UX_STATE.VOTING,
      hasVoted: false,
      storageReady: true,
      loading: true,
    }),
    false,
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
console.log(`\n${cases.length} tests participant OK`);
