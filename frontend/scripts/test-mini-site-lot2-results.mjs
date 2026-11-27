/**
 * Lot 2 — onglet Résultats frontend.
 * Exécution : node frontend/scripts/test-mini-site-lot2-results.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveVisibleMiniSiteTabs,
  minisiteResultTypeLabel,
  miniSiteTabHref,
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

const listPage = read("app/e/[slug]/resultats/page.jsx");
const detailPage = read("app/e/[slug]/resultats/[pollId]/page.jsx");
const list = read("components/minisite/MiniSiteResultsList.jsx");
const detail = read("components/minisite/MiniSiteResultDetail.jsx");
const charts = read("components/minisite/MiniSiteResultsCharts.jsx");
const admin = read("app/admin/events/[eventId]/customization/page.jsx");
const shell = read("components/minisite/MiniSiteShell.jsx");

test("nav : Résultats visible seulement si enabled", () => {
  assert.deepEqual(
    resolveVisibleMiniSiteTabs([
      { id: "accueil", enabled: true },
      { id: "participer", enabled: true },
      { id: "resultats", enabled: true },
    ]).map((t) => t.id),
    ["accueil", "participer", "resultats"],
  );
  assert.equal(
    miniSiteTabHref("abc", "/resultats"),
    "/e/abc/resultats",
  );
  assert.equal(minisiteResultTypeLabel("MULTIPLE_CHOICE"), "Choix multiple");
});

test("routes /resultats + détail", () => {
  assert.match(listPage, /MiniSiteResultsList/);
  assert.match(listPage, /activeTab=["']resultats["']/);
  assert.match(detailPage, /MiniSiteResultDetail/);
  assert.match(detailPage, /activeTab=["']resultats["']/);
});

test("liste : KPIs, graphique, lien détail, mode test", () => {
  assert.match(list, /Répondants/);
  assert.match(list, /Réponses/);
  assert.match(list, /ResultBarsChart/);
  assert.match(list, /Mode test/);
  assert.match(list, /landing\/results/);
  assert.match(list, /cache:\s*["']no-store["']/);
  assert.doesNotMatch(list, /FeedResultCard|LandingHybridFeed/);
});

test("détail : tableau, historique, partage, cumulé vs période", () => {
  assert.match(detail, /Tableau/);
  assert.match(detail, /VolumeHistoryChart/);
  assert.match(detail, /ProportionsHistoryChart/);
  assert.match(detail, /MiniSiteShare/);
  assert.match(detail, /Cumulé/);
  assert.match(detail, /Par période/);
  assert.match(detail, /withHistory:\s*false/);
  assert.match(detail, /peut dépasser/);
  assert.match(detail, /Mode test/);
  assert.match(charts, /pas le suivi individuel|non le suivi individuel|disclaimer/i);
});

test("pas de graphique historique trompeur (données vides)", () => {
  assert.match(detail, /historyPoints|hasHistory/);
  assert.match(detail, /Pas encore assez de données/);
});

test("admin : case Afficher l’onglet Résultats", () => {
  assert.match(admin, /Afficher l’onglet Résultats/);
  assert.match(admin, /miniSiteTabResults/);
  assert.doesNotMatch(admin, /date_trunc|approche A|ResultSnapshot/i);
  const navSection = admin.slice(
    admin.indexOf("Navigation du mini-site"),
    admin.indexOf("Navigation du mini-site") + 1200,
  );
  assert.doesNotMatch(navSection, /granularité|snapshot|SQL/i);
});

test("shell accepte resultats ; Accueil inchangé (fil conservé)", () => {
  assert.match(shell, /resultats/);
  const home = read("app/e/[slug]/page.jsx");
  assert.match(home, /LandingHybridFeed/);
  assert.match(home, /MiniSiteHome/);
});

test("pas de jargon technique public", () => {
  assert.doesNotMatch(list, /SHARE_RESULT|date_trunc|SQL agrégat|approche A/i);
  assert.doesNotMatch(detail, /date_trunc|approche A|voterSessionId/);
  assert.doesNotMatch(list, /LandingHybridFeed|FeedResultCard/);
  assert.match(list, /Mode test — ces résultats ne sont pas définitifs/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) échoué(s)`);
  process.exit(1);
}
console.log("\nTous les tests Lot 2 mini-site résultats frontend OK");
