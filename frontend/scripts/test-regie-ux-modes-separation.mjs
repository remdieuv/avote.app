/**
 * Correctif UX régie — séparation Live / Libre-service.
 * Exécution : node frontend/scripts/test-regie-ux-modes-separation.mjs
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveRegieParticipantsCounterDisplay } from "../lib/regieParticipantsDisplay.js";
import { FREE_PARTICIPANTS_LIMIT } from "../lib/freeOffer.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

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

test("compteur MODE TEST : pas de 0/500 commercial", () => {
  const d = resolveRegieParticipantsCounterDisplay({
    inTestMode: true,
    participantsUsed: 0,
    participantsLimit: 500,
    isFreePlan: true,
  });
  assert.equal(d.label, "Participants (test) : 0");
  assert.equal(d.showCommercialLimit, false);
  assert.match(d.hint || "", /plafond technique/i);
  assert.ok(
    (d.hint || "").includes(String(FREE_PARTICIPANTS_LIMIT)),
    "hint mentionne la limite gratuite",
  );
  assert.doesNotMatch(d.label, /\/\s*500/);
});

test("compteur mode réel : conserve used / limit", () => {
  const d = resolveRegieParticipantsCounterDisplay({
    inTestMode: false,
    participantsUsed: 3,
    participantsLimit: 10,
    isFreePlan: true,
  });
  assert.equal(d.label, "Participants : 3 / 10");
  assert.equal(d.showCommercialLimit, true);
});

test("fichiers UX mode présents", () => {
  for (const rel of [
    "components/admin/RegieModeSelector.jsx",
    "components/admin/SelfServiceRegieWorkspace.jsx",
    "lib/regieParticipantsDisplay.js",
  ]) {
    assert.ok(existsSync(join(root, rel)), `missing ${rel}`);
  }
});

test("régie : sélecteur unique + workspace SS + live masqué", () => {
  const regieSrc = readFileSync(
    join(root, "app/admin/event/[eventId]/page.jsx"),
    "utf8",
  );
  assert.match(regieSrc, /RegieModeSelector/);
  assert.match(regieSrc, /SelfServiceRegieWorkspace/);
  assert.match(regieSrc, /regie-live-only/);
  assert.match(regieSrc, /isSelfServiceRegie/);
  assert.match(regieSrc, /resolveRegieParticipantsCounterDisplay/);
  // Plus de panneau mode dupliqué dans la colonne latérale
  assert.doesNotMatch(regieSrc, /ConsultationModePanel/);
  assert.equal(
    (regieSrc.match(/<RegieModeSelector/g) || []).length,
    1,
    "un seul sélecteur de mode dans la régie",
  );
});

test("sélecteur : explication du mode actif", () => {
  const src = readFileSync(
    join(root, "components/admin/RegieModeSelector.jsx"),
    "utf8",
  );
  assert.match(src, /Live animé/);
  assert.match(src, /Libre-service/);
  assert.match(src, /regie-mode-explanation/);
  assert.match(src, /sans régisseur connecté/);
});

test("workspace SS : consultation + questions + salle", () => {
  const src = readFileSync(
    join(root, "components/admin/SelfServiceRegieWorkspace.jsx"),
    "utf8",
  );
  assert.match(src, /Gestion de la consultation/);
  assert.match(src, /self-service-toggle-consultation/);
  assert.match(src, /Ouvrir la consultation/);
  assert.match(src, /Mettre en pause/);
  assert.match(src, /Questions proposées au public/);
  assert.match(src, /Ajouter une question/);
  assert.match(src, /Ouvrir la salle/);
  assert.match(src, /Résultats/);
  assert.match(src, /SelfServiceResultsModal/);
  assert.match(src, /\/consultation\/\$\{path\}/);
  assert.match(src, /\/consultation\/polls/);
  // Pas de pilotage live dans ce composant
  assert.doesNotMatch(src, /Pilotage du Live/);
  assert.doesNotMatch(src, /Chrono scène/);
  assert.doesNotMatch(src, /Ouvrir le vote/);
  // Résultats en modal régie, pas de lien public /p/
  assert.doesNotMatch(src, /href=\{`\/p\//);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll regie-ux-modes-separation FE tests passed.");
