/**
 * Garde-fous source — blocs repliables /admin + /admin/events.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`✗ ${name}`);
    console.error(e);
  }
}

test("Création : Informations événement repliable, ouvert par défaut", () => {
  const src = read("app/admin/page.js");
  assert.match(src, /useState\(true\)/);
  assert.match(src, /eventInfoOpen/);
  assert.match(src, /data-testid="create-event-info"/);
  assert.match(src, /data-testid="create-event-info-toggle"/);
  assert.match(src, /eventInfoSummaryLine/);
  assert.match(src, /formatDatetimeLocalFr/);
  assert.match(src, /hidden=\{!eventInfoOpen\}/);
  // Questions toujours présentes (non régressées)
  assert.match(src, /openQuestionId/);
  assert.match(src, /admin-question-toggle/);
});

test("Mes événements : cartes repliées par défaut, régie visible", () => {
  const src = read("components/admin/EventDashboardCard.jsx");
  assert.match(src, /useState\(false\)/);
  assert.match(src, /detailsOpen/);
  assert.match(src, /avote-event-card--collapsed/);
  assert.match(src, /data-testid="event-card-toggle"/);
  assert.match(src, /data-testid="event-card-collapsed-summary"/);
  assert.match(src, /data-testid="event-card-details"/);
  assert.match(src, /hidden=\{!detailsOpen\}/);
  assert.match(src, /Ouvrir la régie/);
  assert.match(src, /visibilityLabel/);
  assert.match(src, /isPublicVisibility/);
  // Actions dépliées conservées
  assert.match(src, /Dupliquer/);
  assert.match(src, /Supprimer/);
  assert.match(src, /Ouvrir la salle/);
  assert.match(src, /Statistiques/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests ux-collapsible-admin-blocks OK");
