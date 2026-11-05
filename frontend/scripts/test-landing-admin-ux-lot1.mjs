/**
 * Lot 1 — Admin landing UX (/admin/events/[id]/landing).
 * Garde-fous structurels sur EventCustomizationEditor(mode="landing").
 * Exécution : node frontend/scripts/test-landing-admin-ux-lot1.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const page = readFileSync(
  join(root, "app/admin/events/[eventId]/customization/page.jsx"),
  "utf8",
);
const landingEntry = readFileSync(
  join(root, "app/admin/events/[eventId]/landing/page.jsx"),
  "utf8",
);
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

test("landing route réutilise EventCustomizationEditor mode=landing", () => {
  assert.match(landingEntry, /EventCustomizationEditor/);
  assert.match(landingEntry, /mode=["']landing["']/);
});

test("blocs orga stables (Publication → Fil)", () => {
  // Titres de section h2 (commentaire de lot + libellé affiché)
  assert.match(page, /\{\/\* 1\. Publication \*\/\}/);
  assert.match(page, /\{\/\* 2\. Personnalisation \*\/\}/);
  assert.match(page, /\{\/\* 4\. Galerie événement \*\/\}/);
  assert.match(page, /\{\/\* 5\. Fil de l/);
  assert.match(page, />\s*Publication\s*</);
  assert.match(page, />\s*Personnalisation\s*</);
  assert.match(page, />\s*Galerie événement\s*</);
  assert.match(page, /LandingFeedAdminPanel/);
  assert.match(page, /Fil de l/);
});

test("vocabulaire canonique Galerie événement + Fil", () => {
  assert.match(page, /Galerie événement/);
  assert.match(page, /LandingFeedAdminPanel|Fil de l/);
  assert.doesNotMatch(page, /Galerie live/);
  assert.doesNotMatch(page, /Photos live publiées/);
});

test("aperçu off = empty state (pas iframe /join)", () => {
  assert.match(page, /landingPreviewActive/);
  assert.match(page, /Landing désactivée/);
  assert.match(page, /Enregistrez pour activer l’aperçu/);
  assert.match(page, /Ouvrir \/e \(redirige vers la salle\)/);
});

test("onglets mobile Réglages / Aperçu aussi en mode landing", () => {
  assert.match(page, /\{!loading \? \(/);
  assert.match(page, /data-mobile-panel=\{mobilePanel\}/);
  assert.doesNotMatch(page, /data-mobile-panel=\{isLivePage \? mobilePanel : "form"\}/);
});

test("distinction Enregistrer vs galeries immédiates", () => {
  assert.match(feedAdmin, /En ligne dès l’ajout/);
  assert.match(page, /Publication \/ personnalisation non enregistrées \(galeries déjà en ligne\)/);
  assert.match(page, /Publication & personnalisation à jour · galeries immédiates/);
  assert.match(page, /LANDING_SHOWCASE_MAX/);
  assert.match(page, /LANDING_LIVE_PHOTOS_MAX/);
});

test("fil admin : photos via API existante + panel centralisé", () => {
  assert.match(page, /addLiveMomentPhotos/);
  assert.match(page, /removeLiveMomentPhoto/);
  assert.match(page, /landing\/photos/);
  assert.match(page, /prepareLandingPhotoForUpload/);
  assert.match(page, /LandingFeedAdminPanel/);
  assert.match(page, /closedLandingPolls/);
  assert.match(page, /onAddPhotos/);
  assert.match(page, /onRemovePhoto/);
});

test("reload aperçu après save / photos", () => {
  assert.match(page, /previewNonce/);
  assert.match(page, /bumpLandingPreview/);
  assert.match(page, /key=\{`\$\{mode\}-\$\{slug \?\? "preview"\}-\$\{previewNonce\}`\}/);
});

test("lien logo/couleur → Salle live", () => {
  assert.match(page, /Logo et couleur/);
  assert.match(page, /\/live/);
});

test("layout desktop sticky + mobile tabs CSS", () => {
  assert.match(page, /@media \(min-width: 901px\)/);
  assert.match(page, /@media \(max-width: 900px\)/);
  assert.match(page, /customization-mobile-tabs/);
  assert.match(page, /Réglages/);
  assert.match(page, />\s*Aperçu\s*</);
  assert.match(
    page,
    /customization-layout\[data-mobile-panel="form"\] \.customization-preview-col/,
  );
  assert.match(
    page,
    /customization-layout\[data-mobile-panel="preview"\] \.customization-form-col/,
  );
  // Desktop : split-scroll (shell 100dvh, pas de sticky)
  assert.match(page, /customization-shell/);
  assert.match(page, /customization-preview-col/);
  assert.match(page, /height:\s*100dvh/);
  assert.match(page, /overflow-y:\s*auto/);
  assert.doesNotMatch(
    page,
    /\.customization-preview-(?:card|col)\s*\{[^}]*position:\s*sticky/s,
  );
  assert.match(page, /customization-preview-iframe/);
  assert.match(page, /Ouvrir la landing publiée/);
  assert.match(page, /position:\s*static/);
});

test("message organisateur : hint upload direct ou galerie", () => {
  assert.match(
    page,
    /ajoutant une\s+photo directement|choisissant des photos déjà\s+présentes dans la galerie/,
  );
  assert.doesNotMatch(
    page,
    /Illustrations = photos de la galerie\s+événement \(pas de nouvel upload\)/,
  );
});

test("pas de modification surface publique dans ce fichier hub", () => {
  // Le fichier customization ne doit pas patcher /e
  assert.doesNotMatch(page, /resolveEventLandingPhase/);
});

if (failed) {
  console.error(`\n${failed} test(s) échoué(s)`);
  process.exit(1);
}
console.log("\nTous les tests Lot 1 landing admin OK");
