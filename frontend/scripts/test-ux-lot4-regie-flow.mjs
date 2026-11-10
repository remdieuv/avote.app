/**
 * Lot 4 UX — déroulement régie (étapes / Fermer vs Terminer / glossaire).
 * Exécution : node frontend/scripts/test-ux-lot4-regie-flow.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getRegiePrimaryLiveAction } from "../lib/regieDesktopLayout.js";
import {
  REGIE_CLOSE_VS_FINISH_HINT,
  REGIE_CLOSE_VOTE_TITLE,
  REGIE_FINISH_EVENT_TITLE,
  REGIE_LIVE_FLOW_STEPS,
  deriveRegieLiveFlowStep,
  getRegieLiveFlowModeLine,
  getRegieLiveFlowNextHint,
  getRegiePrimaryLiveActionTitle,
  getRegieToolGlossary,
} from "../lib/regieLiveFlowSteps.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
let failed = 0;

/** @param {string} rel */
function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

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

test("5 étapes dans l’ordre moteur (Fermer avant Résultats)", () => {
  assert.equal(REGIE_LIVE_FLOW_STEPS.length, 5);
  assert.deepEqual(
    REGIE_LIVE_FLOW_STEPS.map((s) => s.id),
    ["prepare", "open", "close", "results", "finish"],
  );
  assert.match(REGIE_LIVE_FLOW_STEPS[0].label, /Préparer/i);
  assert.match(REGIE_LIVE_FLOW_STEPS[1].label, /Ouvrir le vote/i);
  assert.match(REGIE_LIVE_FLOW_STEPS[2].label, /Fermer le vote/i);
  assert.match(REGIE_LIVE_FLOW_STEPS[3].label, /Afficher les résultats/i);
  assert.match(REGIE_LIVE_FLOW_STEPS[4].label, /Terminer/i);
});

test("dérivation alignée sur getRegiePrimaryLiveAction (pas de nouvel état)", () => {
  const base = {
    hasActivePoll: true,
    hasNextPoll: true,
    eventFinished: false,
  };

  const prepare = {
    ...base,
    voteState: "closed",
    displayState: "waiting",
    pollStatus: "ACTIVE",
  };
  assert.equal(getRegiePrimaryLiveAction(prepare), "open");
  assert.equal(deriveRegieLiveFlowStep(prepare).currentId, "open");
  assert.equal(deriveRegieLiveFlowStep(prepare).currentIndex, 1);

  const voting = { ...base, voteState: "open", displayState: "question", pollStatus: "ACTIVE" };
  assert.equal(getRegiePrimaryLiveAction(voting), "close");
  assert.equal(deriveRegieLiveFlowStep(voting).currentId, "close");

  const closed = {
    ...base,
    voteState: "closed",
    displayState: "question",
    pollStatus: "CLOSED",
  };
  assert.equal(getRegiePrimaryLiveAction(closed), "show-results");
  assert.equal(deriveRegieLiveFlowStep(closed).currentId, "results");

  const results = {
    ...base,
    voteState: "closed",
    displayState: "results",
    pollStatus: "CLOSED",
  };
  assert.equal(getRegiePrimaryLiveAction(results), "next");
  assert.equal(deriveRegieLiveFlowStep(results).currentId, "results");

  const last = {
    ...base,
    hasNextPoll: false,
    voteState: "closed",
    displayState: "results",
    pollStatus: "CLOSED",
  };
  assert.equal(getRegiePrimaryLiveAction(last), "finish");
  assert.equal(deriveRegieLiveFlowStep(last).currentId, "finish");

  const done = deriveRegieLiveFlowStep({ ...base, eventFinished: true });
  assert.equal(done.completed, true);
  assert.equal(done.currentId, "finish");
});

test("hints prochaine action + Fermer ≠ Terminer", () => {
  const openHint = getRegieLiveFlowNextHint({
    voteState: "closed",
    displayState: "waiting",
    pollStatus: "ACTIVE",
    hasActivePoll: true,
    hasNextPoll: true,
  });
  assert.match(openHint, /Ouvrir le vote/i);

  const closeHint = getRegieLiveFlowNextHint({
    voteState: "open",
    displayState: "question",
    pollStatus: "ACTIVE",
    hasActivePoll: true,
  });
  assert.match(closeHint, /Fermer le vote/i);

  assert.match(REGIE_CLOSE_VS_FINISH_HINT, /Fermer le vote/i);
  assert.match(REGIE_CLOSE_VS_FINISH_HINT, /Terminer l’événement/i);
  assert.match(REGIE_CLOSE_VOTE_TITLE, /question en cours/i);
  assert.match(REGIE_FINISH_EVENT_TITLE, /définitive|clôture/i);
  assert.equal(
    getRegiePrimaryLiveActionTitle("close"),
    REGIE_CLOSE_VOTE_TITLE,
  );
  assert.equal(
    getRegiePrimaryLiveActionTitle("finish"),
    REGIE_FINISH_EVENT_TITLE,
  );
});

test("glossaire outils + MODE TEST / RÉEL", () => {
  const g = getRegieToolGlossary();
  assert.match(g.screen.body, /\/screen|OBS|salle/i);
  assert.match(g.telecommande.body, /téléphone/i);
  assert.match(g.qr.body, /participant/i);
  assert.match(g.chrono.body, /Décompte|chron/i);
  assert.match(getRegieLiveFlowModeLine({ inTestMode: true }), /MODE TEST/i);
  assert.match(getRegieLiveFlowModeLine({ inTestMode: false }), /MODE RÉEL/i);
  assert.doesNotMatch(
    getRegieLiveFlowModeLine({ inTestMode: true }),
    /Aucune activation disponible/i,
  );
});

test("UI régie branche le stepper sans toucher API / moteur", () => {
  const page = read("app/admin/event/[eventId]/page.jsx");
  const stepper = read("components/admin/RegieLiveFlowStepper.jsx");
  assert.match(page, /RegieLiveFlowStepper/);
  assert.match(page, /deriveRegieLiveFlowStep/);
  assert.match(page, /REGIE_FINISH_EVENT_TITLE/);
  assert.match(stepper, /regie-live-flow-stepper/);
  assert.match(stepper, /regie-close-vs-finish-hint/);
  assert.doesNotMatch(page, /app\.post\(\s*"\/polls/);
  assert.doesNotMatch(page, /voteState\s*=\s*"OPEN"/);
});

test("helpers desktop CTA inchangés (régression open→close→results→finish)", () => {
  const seq = [
    {
      voteState: "closed",
      displayState: "waiting",
      pollStatus: "ACTIVE",
      hasActivePoll: true,
      hasNextPoll: true,
      expect: "open",
    },
    {
      voteState: "open",
      displayState: "question",
      pollStatus: "ACTIVE",
      hasActivePoll: true,
      hasNextPoll: true,
      expect: "close",
    },
    {
      voteState: "closed",
      displayState: "question",
      pollStatus: "CLOSED",
      hasActivePoll: true,
      hasNextPoll: true,
      expect: "show-results",
    },
    {
      voteState: "closed",
      displayState: "results",
      pollStatus: "CLOSED",
      hasActivePoll: true,
      hasNextPoll: false,
      expect: "finish",
    },
  ];
  for (const row of seq) {
    assert.equal(getRegiePrimaryLiveAction(row), row.expect);
  }
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log("\nAll test-ux-lot4-regie-flow tests passed.");
