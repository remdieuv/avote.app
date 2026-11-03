/**
 * Centralisation Fil — admin Landing vs régie.
 * Exécution : node frontend/scripts/test-landing-fil-admin-centralise.mjs
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const customization = readFileSync(
  join(root, "app/admin/events/[eventId]/customization/page.jsx"),
  "utf8",
);
const regie = readFileSync(
  join(root, "app/admin/event/[eventId]/page.jsx"),
  "utf8",
);
const publicPage = readFileSync(join(root, "app/e/[slug]/page.jsx"), "utf8");
const feedAdmin = readFileSync(
  join(root, "components/event/LandingFeedAdminPanel.jsx"),
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

test("section Fil dans admin landing", () => {
  assert.match(customization, /LandingFeedAdminPanel/);
  assert.match(customization, /Fil de l/);
  assert.match(customization, /closedLandingPolls/);
  assert.match(feedAdmin, /data-testid="landing-feed-admin"/);
  assert.match(feedAdmin, /Publier une photo/);
  assert.match(feedAdmin, /Publier le message/);
  assert.match(feedAdmin, /Publications \(récent/);
  assert.match(feedAdmin, /Résultats dans le fil/);
});

test("pas de doublon Moments live séparé", () => {
  assert.doesNotMatch(customization, /\{\/\* 4\. Moments live \*\/\}/);
  assert.doesNotMatch(
    customization,
    /aussi publiables depuis la régie/,
  );
});

test("régie : plus de messages ni hide résultat", () => {
  assert.doesNotMatch(regie, /RegieLandingJournalPanel/);
  assert.doesNotMatch(regie, /onToggleLandingResult/);
  assert.doesNotMatch(regie, /Masquer du fil/);
  assert.doesNotMatch(regie, /Message landing/);
  // Photo rapide régie conservée
  assert.match(regie, /onQuickLandingPhoto|Galerie live/);
});

test("ancien panel régie retiré", () => {
  assert.equal(
    existsSync(join(root, "components/event/RegieLandingJournalPanel.jsx")),
    false,
  );
});

test("public inchangé : feed + likes + Partager + rétention soft-refresh", () => {
  assert.match(publicPage, /LandingHybridFeed/);
  assert.match(publicPage, /Partager une photo/);
  assert.match(publicPage, /handleTogglePhotoLike/);
  assert.match(publicPage, /landingKeepPhotosAfter/);
  assert.match(publicPage, /CameraIcon/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) échoué(s)`);
  process.exit(1);
}
console.log("\nTous les tests Fil admin centralisé OK");
