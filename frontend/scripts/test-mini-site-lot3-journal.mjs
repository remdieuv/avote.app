/**
 * Lot 3 — onglet Journal frontend + UX fil Accueil.
 * Exécution : node frontend/scripts/test-mini-site-lot3-journal.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveVisibleMiniSiteTabs,
  miniSiteTabHref,
  formatFrenchDisplayText,
  MINI_SITE_AVAILABLE_OPTIONAL_TAB_IDS,
} from "../lib/miniSiteUi.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

/** @param {string} rel */
function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

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

const journalPage = read("app/e/[slug]/journal/page.jsx");
const homePage = read("app/e/[slug]/page.jsx");
const journal = read("components/minisite/MiniSiteJournal.jsx");
const feed = read("components/event/LandingHybridFeed.jsx");
const admin = read("app/admin/events/[eventId]/customization/page.jsx");
const feedAdmin = read("components/event/LandingFeedAdminPanel.jsx");
const shell = read("components/minisite/MiniSiteShell.jsx");

test("nav : Journal visible seulement si enabled, après Résultats", () => {
  assert.ok(MINI_SITE_AVAILABLE_OPTIONAL_TAB_IDS.includes("journal"));
  assert.deepEqual(
    resolveVisibleMiniSiteTabs([
      { id: "accueil", enabled: true },
      { id: "participer", enabled: true },
      { id: "resultats", enabled: true },
      { id: "journal", enabled: true },
    ]).map((t) => t.id),
    ["accueil", "participer", "resultats", "journal"],
  );
  assert.equal(miniSiteTabHref("abc", "/journal"), "/e/abc/journal");
  assert.deepEqual(
    resolveVisibleMiniSiteTabs([
      { id: "accueil", enabled: true },
      { id: "participer", enabled: true },
      { id: "journal", enabled: false },
    ]).map((t) => t.id),
    ["accueil", "participer"],
  );
});

test("route /journal + shell", () => {
  assert.match(journalPage, /MiniSiteJournal/);
  assert.match(journalPage, /activeTab=["']journal["']/);
  assert.match(journalPage, /MINISITE_JOURNAL_DISABLED|miniSiteTabJournal|journal/);
  assert.match(shell, /journal|resolveVisibleMiniSiteTabs/);
});

test("Accueil : aperçu Journal si activé, fil hybride sinon", () => {
  assert.match(homePage, /MiniSiteJournalPreview/);
  assert.match(homePage, /journalTabOn/);
  assert.match(homePage, /LandingHybridFeed/);
  assert.match(homePage, /Voir le journal|MiniSiteJournalPreview/);
});

test("Journal : charge API, soft refresh, pas de commentaires", () => {
  assert.match(journal, /landing\/journal/);
  assert.match(journal, /cache:\s*["']no-store["']/);
  assert.match(journal, /45_000|45000/);
  assert.doesNotMatch(journal, /like|commentaire|catégorie/i);
  assert.match(journal, /ResultBarsChart/);
  assert.match(journal, /formatFrenchDisplayText/);
});

test("fil Accueil : NBSP questions + % réel (pas maxVotes)", () => {
  assert.match(feed, /formatFrenchDisplayText\(question\)/);
  assert.doesNotMatch(feed, /maxVotes/);
  assert.match(feed, /opt\?\.percent|Number\(opt\?\.percent\)/);
  assert.match(feed, /answers \?\? opt\?\.votes|opt\?\.answers/);
  assert.match(feed, /toLocaleString\("fr-FR"/);
});

test("NBSP français toujours OK", () => {
  assert.match(formatFrenchDisplayText("Qui vient ?"), /\u202F\?/);
});

test("admin : case Journal + actualités titre/image", () => {
  assert.match(admin, /Afficher l’onglet Journal/);
  assert.match(admin, /miniSiteTabJournal/);
  assert.match(feedAdmin, /draftTitle|TITLE_MAX|Titre de l’actualité/);
  assert.match(feedAdmin, /upload-image|Image facultative/);
  assert.match(feedAdmin, /Modifier/);
  assert.match(feedAdmin, /Publier l’actualité|Enregistrer/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) échoué(s)`);
  process.exit(1);
}
console.log("\nTous les tests Lot 3 mini-site Journal frontend OK");
