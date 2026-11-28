/**
 * Lot 3 finition — aperçu Accueil, partage actualités, barres Journal.
 * Exécution : node frontend/scripts/test-mini-site-lot3-journal-finition.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  excerptFrenchText,
  formatFrenchDisplayText,
  absoluteMiniSiteUrl,
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

const home = read("components/minisite/MiniSiteHome.jsx");
const journal = read("components/minisite/MiniSiteJournal.jsx");
const newsDetail = read("components/minisite/MiniSiteNewsDetail.jsx");
const newsPage = read("app/e/[slug]/journal/[messageId]/page.jsx");
const newsClient = read("app/e/[slug]/journal/[messageId]/NewsDetailClient.jsx");
const charts = read("components/minisite/MiniSiteResultsCharts.jsx");
const share = read("components/minisite/MiniSiteShare.jsx");

test("Accueil : pas de Dernière actualité si Journal activé", () => {
  assert.match(home, /journalTabOn/);
  assert.match(home, /!journalTabOn/);
  assert.match(home, /Dernière actualité/);
});

test("aperçu Journal : date, image compacte, extrait, Lire la suite, Partager", () => {
  assert.match(journal, /Lire la suite/);
  assert.match(journal, /excerptFrenchText/);
  assert.match(journal, /MiniSiteShare/);
  assert.match(journal, /gridTemplateColumns.*72px|width:\s*72/);
  assert.match(journal, /sharePath/);
});

test("page individuelle + OG generateMetadata", () => {
  assert.match(newsPage, /generateMetadata/);
  assert.match(newsPage, /openGraph/);
  assert.match(newsPage, /robots/);
  assert.match(newsPage, /INVITE|privé|noindex|index:\s*false/);
  assert.match(newsClient, /MiniSiteShell/);
  assert.match(newsClient, /activeTab=["']journal["']/);
  assert.match(newsDetail, /Retour au journal/);
  assert.match(newsDetail, /MiniSiteShare/);
  assert.match(newsDetail, /landing\/journal\//);
});

test("ResultBarsChart : styles flex inclus + NBSP %", () => {
  assert.match(charts, /justify-content:\s*space-between/);
  assert.match(charts, /ms-r-bar-meta/);
  assert.match(charts, /formatFrenchDisplayText/);
  assert.match(charts, /white-space:\s*nowrap/);
});

test("helpers extrait / URL absolue", () => {
  assert.equal(excerptFrenchText("Court"), "Court");
  assert.match(excerptFrenchText("a ".repeat(200), 40), /…$/);
  assert.match(formatFrenchDisplayText("66,7 %"), /\u00A0%/);
  assert.equal(absoluteMiniSiteUrl("/e/x/journal/y").endsWith("/e/x/journal/y"), true);
});

test("MiniSiteShare compact réutilisable", () => {
  assert.match(share, /size\s*=\s*["']default["']|size === ["']compact["']/);
  assert.match(share, /navigator\.share/);
  assert.match(share, /clipboard\.writeText/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) échoué(s)`);
  process.exit(1);
}
console.log("\nTous les tests Lot 3 finition Journal OK");
