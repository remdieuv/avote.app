/**
 * LOT-1 QA — libellés régie projection (WAITING ≠ Noir / BLACK).
 * Exécution : node frontend/scripts/test-regie-projection-labels.mjs
 */
import assert from "node:assert/strict";
import {
  REGIE_DISPLAY_STATE_LABELS,
  getRegieDisplayStateLabel,
  getRegieIdleProjectionHint,
  isRegieProjectionBlack,
  isRegieProjectionWaiting,
  resolveScreenReturnToLiveAction,
} from "../lib/regieProjectionLabels.js";

const waiting = getRegieDisplayStateLabel("waiting");
assert.equal(waiting, REGIE_DISPLAY_STATE_LABELS.waiting);
assert.match(waiting, /QR/i);
assert.ok(!/ne voit rien/i.test(waiting), "WAITING ne doit pas annoncer un écran vide");
assert.ok(!/Relancez la projection/i.test(waiting));

const black = getRegieDisplayStateLabel("black");
assert.equal(black, REGIE_DISPLAY_STATE_LABELS.black);
assert.match(black, /Noir|noir|écran noir/i);
assert.notEqual(waiting, black, "WAITING ≠ BLACK");

assert.equal(isRegieProjectionWaiting("waiting"), true);
assert.equal(isRegieProjectionWaiting("black"), false);
assert.equal(isRegieProjectionBlack("black"), true);
assert.equal(isRegieProjectionBlack("waiting"), false);

assert.equal(
  getRegieIdleProjectionHint({ projectionDisplayState: "waiting" }),
  "Projection en attente — écran QR affiché. Ouvrez le vote pour lancer la question.",
);
assert.equal(
  getRegieIdleProjectionHint({ projectionDisplayState: "black" }),
  "Projection en noir — la salle voit un écran noir.",
);
assert.match(
  getRegieIdleProjectionHint({ eventFinished: true }),
  /terminé/i,
);

assert.equal(
  getRegieDisplayStateLabel("question"),
  REGIE_DISPLAY_STATE_LABELS.question,
);
assert.equal(
  getRegieDisplayStateLabel("results"),
  REGIE_DISPLAY_STATE_LABELS.results,
);
assert.equal(
  getRegieDisplayStateLabel("results", { pollType: "CONTEST_ENTRY" }),
  "Tirage terminé (gagnants)",
);
assert.equal(
  getRegieDisplayStateLabel("results", {
    leadEnabled: true,
    pollType: "SINGLE_CHOICE",
  }),
  "Collecte",
);
assert.equal(
  getRegieDisplayStateLabel("results", { pollType: "QUIZ" }),
  REGIE_DISPLAY_STATE_LABELS.results,
  "Quiz : libellé barres inchangé",
);

// Retour au direct — aligné sur le pilotage, jamais WAITING systématique
assert.equal(
  resolveScreenReturnToLiveAction({
    salleDisplayState: "question",
    liveState: "voting",
    voteState: "open",
    hasActivePoll: true,
  }),
  "QUESTION",
  "question ouverte → QUESTION",
);
assert.equal(
  resolveScreenReturnToLiveAction({
    salleDisplayState: "results",
    liveState: "results",
    voteState: "closed",
    hasActivePoll: true,
  }),
  "RESULTS",
  "résultats affichés → RESULTS",
);
assert.equal(
  resolveScreenReturnToLiveAction({
    salleDisplayState: "waiting",
    liveState: "waiting",
    voteState: "closed",
    hasActivePoll: false,
  }),
  "WAITING",
  "aucune diffusion → WAITING",
);
assert.equal(
  resolveScreenReturnToLiveAction({
    salleDisplayState: "waiting",
    liveState: "voting",
    voteState: "open",
    hasActivePoll: true,
  }),
  "QUESTION",
  "live voting malgré salle waiting → QUESTION",
);
assert.equal(
  resolveScreenReturnToLiveAction({
    salleDisplayState: "black",
    liveState: "results",
    voteState: "closed",
    hasActivePoll: true,
  }),
  "RESULTS",
  "après Noir, pilotage results → RESULTS (pas WAITING)",
);
assert.equal(
  resolveScreenReturnToLiveAction({
    salleDisplayState: "waiting",
    liveState: "waiting",
    voteState: "closed",
    hasActivePoll: true,
  }),
  "WAITING",
  "après Attente / QR, pas de question diffusée → WAITING",
);

console.log("ok  régie WAITING = QR réel · BLACK = écran noir · Retour au direct");
