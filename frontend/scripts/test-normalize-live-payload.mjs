/**
 * Socle Live — normalisation payloads + anti-régression G6/G9 / resolveLiveUxState.
 * Exécution : node frontend/scripts/test-normalize-live-payload.mjs
 */
import assert from "node:assert/strict";
import {
  LIVE_UX_STATE,
  getLiveStateLabel,
  getLiveStatePresentation,
  resolveLiveUxState,
} from "../lib/liveStateUx.js";
import {
  normalizeLiveAxes,
  normalizePollJson,
  normalizePollOptions,
  optionVoteCount,
} from "../lib/normalizeLivePayload.js";
import {
  shouldJoinSocketJoinActivePoll,
  shouldPollOpenOwnSocket,
} from "../lib/participantLiveFlow.js";

/** @type {{ name: string; run: () => void }[]} */
const cases = [];

function test(name, run) {
  cases.push({ name, run });
}

test("normalizeLiveAxes unifie bare + event* sans fusionner screen", () => {
  const axes = normalizeLiveAxes({
    eventLiveState: "VOTING",
    eventVoteState: "OPEN",
    eventDisplayState: "QUESTION",
    eventScreenDisplayState: "BLACK",
    screenDisplayState: "black",
  });
  assert.equal(axes.liveState, "voting");
  assert.equal(axes.voteState, "open");
  assert.equal(axes.displayState, "question");
  assert.equal(axes.screenDisplayState, "black");
  assert.notEqual(axes.displayState, axes.screenDisplayState);
});

test("normalizeLiveAxes préfère bare si présent", () => {
  const axes = normalizeLiveAxes({
    liveState: "results",
    eventLiveState: "voting",
    voteState: "closed",
    eventVoteState: "open",
    displayState: "results",
    eventDisplayState: "question",
  });
  assert.equal(axes.liveState, "results");
  assert.equal(axes.voteState, "closed");
  assert.equal(axes.displayState, "results");
});

test("optionVoteCount accepte votes ou voteCount", () => {
  assert.equal(optionVoteCount({ votes: 3 }), 3);
  assert.equal(optionVoteCount({ voteCount: 5 }), 5);
  assert.equal(optionVoteCount({ voteCount: 2, votes: 9 }), 2);
  assert.equal(optionVoteCount({}), 0);
});

test("normalizePollOptions aligne votes et voteCount", () => {
  const opts = normalizePollOptions([
    { id: "a", label: "A", votes: 1 },
    { id: "b", label: "B", voteCount: 4 },
  ]);
  assert.equal(opts[0].votes, 1);
  assert.equal(opts[0].voteCount, 1);
  assert.equal(opts[1].votes, 4);
  assert.equal(opts[1].voteCount, 4);
});

test("normalizePollJson expose axes bare + contestWinnersCount + votersCount", () => {
  const json = normalizePollJson({
    id: "p1",
    eventLiveState: "voting",
    eventVoteState: "open",
    eventDisplayState: "question",
    eventScreenDisplayState: "black",
    options: [{ id: "o1", label: "Oui", votes: 7 }],
    contestWinnersCount: 2,
    votersCount: 10,
  });
  assert.equal(json.liveState, "voting");
  assert.equal(json.voteState, "open");
  assert.equal(json.displayState, "question");
  assert.equal(json.options[0].voteCount, 7);
  assert.equal(json.contestWinnersCount, 2);
  assert.equal(json.votersCount, 10);
  // Salle ≠ Screen : screen reste distinct, pas copié dans displayState
  assert.equal(json.displayState, "question");
  assert.notEqual(json.displayState, "black");
});

test("G6 régie : options normalisées non vides si votes", () => {
  const activePoll = {
    voteCount: 3,
    options: [
      { id: "a", label: "A", votes: 1, voteCount: 1 },
      { id: "b", label: "B", votes: 2, voteCount: 2 },
    ],
  };
  const opts = normalizePollOptions(activePoll.options);
  assert.equal(opts.length, 2);
  const total = opts.reduce((s, o) => s + optionVoteCount(o), 0);
  assert.equal(total, 3);
});

test("G9 : contestWinnersCount bump détectable pour refetch", () => {
  const before = normalizePollJson({
    id: "c1",
    options: [{ id: "o", label: "Oui", votes: 1 }],
    contestWinnersCount: 0,
  });
  const after = normalizePollJson({
    id: "c1",
    options: [{ id: "o", label: "Oui", votes: 1 }],
    contestWinnersCount: 1,
  });
  assert.notEqual(before.contestWinnersCount, after.contestWinnersCount);
  assert.equal(after.contestWinnersCount, 1);
});

test("Participant : top label = resolveLiveUxState, pas getUxState CLOSED trompeur", () => {
  // Copie jamais lancée : getUxState dirait CLOSED (vote closed), resolve dit WAITING
  const ctx = {
    liveScene: "waiting",
    displayState: "waiting",
    voteState: "closed",
    pollStatus: "ACTIVE",
    hasActivePoll: true,
  };
  const ux = resolveLiveUxState(ctx);
  assert.equal(ux, LIVE_UX_STATE.WAITING);
  const pres = getLiveStatePresentation(ctx);
  assert.equal(pres.title, getLiveStateLabel(LIVE_UX_STATE.WAITING));
  assert.notEqual(pres.title, getLiveStateLabel(LIVE_UX_STATE.CLOSED));
});

const uxMatrix = [
  ["WAITING", { liveScene: "waiting", displayState: "waiting", voteState: "closed", pollStatus: null, hasActivePoll: false }],
  ["VOTING", { liveScene: "voting", displayState: "question", voteState: "open", pollStatus: "ACTIVE", hasActivePoll: true }],
  ["CLOSED", { liveScene: "waiting", displayState: "question", voteState: "closed", pollStatus: "CLOSED", hasActivePoll: true }],
  ["RESULTS", { liveScene: "results", displayState: "results", voteState: "closed", pollStatus: "CLOSED", hasActivePoll: true }],
  ["PAUSED", { liveScene: "paused", displayState: "black", voteState: "closed", pollStatus: "ACTIVE", hasActivePoll: true }],
  ["FINISHED", { liveScene: "finished", displayState: "waiting", voteState: "closed", pollStatus: null, hasActivePoll: false }],
];

for (const [name, ctx] of uxMatrix) {
  test(`UX matrix ${name}`, () => {
    assert.equal(resolveLiveUxState(ctx), LIVE_UX_STATE[name]);
  });
}

test("A3 : un seul socket Participant (embedded sans io propre)", () => {
  assert.equal(shouldPollOpenOwnSocket({ embedded: true }), false);
  assert.equal(shouldJoinSocketJoinActivePoll({ activePollId: "p1" }), true);
});

test("Salle ≠ Screen : displayState black ≠ screen BLACK pour salle", () => {
  // Participant PAUSED seulement si displayState (salle) = black, pas screenDisplayState
  const salleOk = resolveLiveUxState({
    liveScene: "voting",
    displayState: "question",
    voteState: "open",
    pollStatus: "ACTIVE",
    hasActivePoll: true,
  });
  assert.equal(salleOk, LIVE_UX_STATE.VOTING);
  const axes = normalizeLiveAxes({
    liveState: "voting",
    displayState: "question",
    screenDisplayState: "black",
    voteState: "open",
  });
  assert.equal(axes.displayState, "question");
  assert.equal(axes.screenDisplayState, "black");
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
console.log(`\n${cases.length} tests normalize-live-payload OK`);
