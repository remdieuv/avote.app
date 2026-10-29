/**
 * LOT-4 / P5 — Télécommande mobile (helpers + présence chrome).
 * Exécution : node frontend/scripts/test-regie-telecommande.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRegieModeHref,
  confirmTelecommandeFinish,
  getTelecommandeConnectionStatus,
  getTelecommandeNextAction,
  getTelecommandeVoteToggle,
  readForceFullRegieFromSearch,
  shouldUseTelecommandeChrome,
} from "../lib/regieTelecommande.js";

const here = dirname(fileURLToPath(import.meta.url));
const pageSrc = readFileSync(
  join(here, "../app/admin/event/[eventId]/page.jsx"),
  "utf8",
);
const componentSrc = readFileSync(
  join(here, "../components/admin/RegieTelecommande.jsx"),
  "utf8",
);

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

test("Chrome télécommande si mobile et pas full", () => {
  assert.equal(
    shouldUseTelecommandeChrome({ desktop: false, forceFullRegie: false }),
    true,
  );
  assert.equal(
    shouldUseTelecommandeChrome({ desktop: true, forceFullRegie: false }),
    false,
  );
  assert.equal(
    shouldUseTelecommandeChrome({ desktop: false, forceFullRegie: true }),
    false,
  );
});

test("Indicateur connexion — Connecté / Connexion en cours / Déconnecté", () => {
  assert.equal(
    getTelecommandeConnectionStatus({ connected: true }).label,
    "Connecté",
  );
  assert.equal(
    getTelecommandeConnectionStatus({ reconnecting: true }).label,
    "Connexion en cours",
  );
  assert.equal(getTelecommandeConnectionStatus({}).label, "Déconnecté");
  assert.equal(
    getTelecommandeConnectionStatus({ connected: true, reconnecting: true })
      .key,
    "connected",
  );
});

test("Vote toggle — close > open > show-results > draw", () => {
  assert.deepEqual(
    getTelecommandeVoteToggle({ canCloseVote: true, canOpenVote: true }),
    { action: "close", label: "Fermer le vote", enabled: true },
  );
  assert.equal(
    getTelecommandeVoteToggle({ canOpenVote: true }).action,
    "open",
  );
  assert.equal(
    getTelecommandeVoteToggle({
      canShowResults: true,
      showResultsLabel: "Afficher les résultats maintenant",
    }).label,
    "Afficher les résultats maintenant",
  );
  assert.equal(getTelecommandeVoteToggle({ canDraw: true }).action, "draw");
  assert.equal(getTelecommandeVoteToggle({}).enabled, false);
});

test("Next — next-poll prioritaire sur skip", () => {
  assert.deepEqual(
    getTelecommandeNextAction({ canGoNext: true, canSkip: true }),
    { mode: "next", label: "Question suivante", enabled: true },
  );
  assert.equal(
    getTelecommandeNextAction({
      canSkip: true,
      skipLabel: "Passer cette question",
    }).mode,
    "skip",
  );
  assert.equal(
    getTelecommandeNextAction({ isLastQuestion: true }).label,
    "Dernière question",
  );
});

test("Confirm Terminer exige le mot TERMINER", () => {
  assert.equal(
    confirmTelecommandeFinish({
      confirmFn: () => true,
      promptFn: () => "TERMINER",
    }),
    true,
  );
  assert.equal(
    confirmTelecommandeFinish({
      confirmFn: () => true,
      promptFn: () => "non",
    }),
    false,
  );
  assert.equal(
    confirmTelecommandeFinish({
      confirmFn: () => false,
      promptFn: () => "TERMINER",
    }),
    false,
  );
});

test("Query full=1 et href mode", () => {
  assert.equal(readForceFullRegieFromSearch("?full=1"), true);
  assert.equal(readForceFullRegieFromSearch("full=1"), true);
  assert.equal(readForceFullRegieFromSearch("?foo=1"), false);
  assert.equal(
    buildRegieModeHref("/admin/event/abc", true),
    "/admin/event/abc?full=1",
  );
  assert.equal(
    buildRegieModeHref("/admin/event/abc?full=1", false),
    "/admin/event/abc",
  );
});

test("Composant T-E1 expose les 4 actions + Régie complète", () => {
  assert.match(componentSrc, /data-testid="regie-telecommande"/);
  assert.match(componentSrc, /Télécommande/);
  assert.match(componentSrc, /Régie complète/);
  assert.match(componentSrc, /Afficher QR/);
  assert.match(componentSrc, /Terminer…/);
  assert.match(componentSrc, /Liste des questions/);
  assert.match(componentSrc, /telecommande-connection/);
  assert.match(componentSrc, /telecommande-chrono/);
  assert.match(componentSrc, /getTelecommandeConnectionStatus/);
  assert.match(componentSrc, /IconNext|IconQr|IconFinish|IconVote/);
  assert.doesNotMatch(componentSrc, /Projection avancée/);
  assert.doesNotMatch(componentSrc, /BlocProjectionEcran/);
  assert.doesNotMatch(componentSrc, /auto-rotate|autoRotate/i);
});

test("page.jsx branche le chrome télécommande sans route dédiée", () => {
  assert.match(pageSrc, /shouldUseTelecommandeChrome/);
  assert.match(pageSrc, /RegieTelecommande/);
  assert.match(pageSrc, /openMobileFullRegie/);
  assert.match(pageSrc, /mobileFullRegie/);
  assert.match(pageSrc, /socketConnected=\{socketConnected\}/);
  assert.match(pageSrc, /socketReconnecting=\{socketReconnecting\}/);
  assert.match(pageSrc, /PanneauQrParticipant/);
  assert.doesNotMatch(pageSrc, /admin\/event\/\[eventId\]\/remote/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll telecommande tests passed");
