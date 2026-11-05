/**
 * Photos messages : upload direct hors galerie + choix galerie.
 * Exécution : node frontend/scripts/test-landing-message-photos-direct.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const backendRoot = join(root, "../backend");
const require = createRequire(import.meta.url);

const customization = readFileSync(
  join(root, "app/admin/events/[eventId]/customization/page.jsx"),
  "utf8",
);
const evenement = readFileSync(
  join(root, "components/event/LandingEvenementPresentation.jsx"),
  "utf8",
);
const feedUi = readFileSync(
  join(root, "components/event/LandingHybridFeed.jsx"),
  "utf8",
);
const backend = readFileSync(join(backendRoot, "server.js"), "utf8");
const cloudinary = readFileSync(join(backendRoot, "lib/cloudinary.js"), "utf8");
const schema = readFileSync(join(backendRoot, "prisma/schema.prisma"), "utf8");
const migration = readFileSync(
  join(
    backendRoot,
    "prisma/migrations/20261105140000_landing_message_photos_direct/migration.sql",
  ),
  "utf8",
);
const helpers = require(join(backendRoot, "lib/landingEventPresentation.js"));

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

test("schéma + migration showInGallery", () => {
  assert.match(schema, /showInGallery\s+Boolean\s+@default\(true\)/);
  assert.match(migration, /showInGallery/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS/);
  assert.match(migration, /DEFAULT true/);
});

test("API : upload message-only + galerie filtrée + prune", () => {
  assert.match(backend, /\/landing\/message-photos/);
  assert.match(backend, /attach=intro/);
  assert.match(backend, /showInGallery:\s*false/);
  assert.match(backend, /showInGallery:\s*true/);
  assert.match(backend, /pruneUnreferencedMessageOnlyPhotos/);
  assert.match(backend, /scrubPhotoIdFromEventMessages/);
  assert.match(backend, /filter\(\(p\) => p\.showInGallery !== false\)/);
  assert.match(backend, /showInGallery: true/);
  assert.match(cloudinary, /landing_message_photo/);
});

test("helpers : refs messages + retrait id sans mutation fichier", () => {
  assert.deepEqual(helpers.removePhotoIdFromList(["a", "b", "a"], "a"), ["b"]);
  assert.deepEqual(
    [...helpers.collectReferencedMessagePhotoIds({
      landingIntroPhotoIds: ["x", "y"],
      landingThanksPhotoIds: ["y", "z"],
    })].sort(),
    ["x", "y", "z"],
  );
  assert.equal(helpers.MESSAGE_PHOTOS_MAX, 8);
});

test("admin : + Ajouter une photo + Choisir dans la galerie", () => {
  assert.match(customization, /\+\s*Ajouter une photo/);
  assert.match(customization, /Choisir dans la galerie/);
  assert.match(customization, /addMessagePhotos\("intro"/);
  assert.match(customization, /addMessagePhotos\("thanks"/);
  assert.match(customization, /removeMessagePhoto/);
  assert.match(customization, /messagePhotoAssets/);
  assert.match(customization, /messageGalleryPicker/);
  assert.match(customization, /landing\/message-photos\?attach=/);
});

/**
 * Non-régression PR #46 : reset input avant snapshot → FileList live vidé,
 * aucun appel API / aucune miniature.
 */
test("onChange messages : Array.from avant reset input (FileList live)", () => {
  /** @param {"intro"|"thanks"} kind */
  function extractMessageFileOnChange(kind) {
    const marker = `addMessagePhotos("${kind}"`;
    const idx = customization.indexOf(marker);
    assert.ok(idx > 0, `handler ${kind} introuvable`);
    const start = customization.lastIndexOf("onChange={(e) => {", idx);
    assert.ok(start >= 0, `onChange ${kind} introuvable`);
    const end = customization.indexOf("}}", idx);
    assert.ok(end > start, `fin onChange ${kind}`);
    return customization.slice(start, end + 2);
  }

  for (const kind of /** @type {const} */ (["intro", "thanks"])) {
    const block = extractMessageFileOnChange(kind);
    assert.match(block, /Array\.from\(raw\)/);
    assert.match(block, /e\.target\.value\s*=\s*""/);
    const arrayPos = block.indexOf("Array.from(raw)");
    const resetPos = block.indexOf('e.target.value = ""');
    assert.ok(
      arrayPos >= 0 && resetPos > arrayPos,
      `${kind}: Array.from doit précéder le reset value (sinon FileList vide)`,
    );
    assert.doesNotMatch(
      block,
      /const files = e\.target\.files;\s*\n\s*e\.target\.value = "";/,
      `${kind}: pattern FileList live non snapshoté interdit`,
    );
  }

  // Comportement FileList live (même piège que prod Windows).
  const live = {
    _files: [{ name: "a.jpg" }],
    get files() {
      return {
        get length() {
          return live._files.length;
        },
        [Symbol.iterator]() {
          return live._files[Symbol.iterator]();
        },
      };
    },
    set value(_v) {
      live._files = [];
    },
  };
  const brokenRef = live.files;
  live.value = "";
  assert.equal(brokenRef.length, 0, "FileList live se vide au reset");

  const raw = [{ name: "b.jpg" }];
  const snapshot = Array.from(raw);
  live._files = [];
  assert.equal(snapshot.length, 1, "Array.from fige les fichiers");
});

test("indépendance galerie + Fil intact + rendu V3 conservé", () => {
  assert.match(evenement, /landing-evenement-intro/);
  assert.match(evenement, /landing-evenement-thanks/);
  assert.doesNotMatch(evenement, /LandingHybridFeed|onToggleLike/);
  assert.match(feedUi, /Fil de l&apos;événement|Fil de l'événement/);
  assert.match(backend, /showInGallery: false/);
  assert.match(backend, /filter\(\(p\) => p\.showInGallery !== false\)/);
  assert.match(customization, /showInGallery: false/);
  assert.match(customization, /toggleMessagePhoto\("intro"/);
  assert.match(customization, /toggleMessagePhoto\("thanks"/);
  assert.match(customization, /removeMessagePhoto\("intro"/);
  assert.match(customization, /removeMessagePhoto\("thanks"/);
  assert.doesNotMatch(
    customization.slice(
      customization.indexOf("Message de l&apos;organisateur"),
      customization.indexOf("Message de remerciement") + 800,
    ),
    /Ajoutez d&apos;abord des photos à la galerie événement/,
  );
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll landing-message-photos-direct tests passed.");
