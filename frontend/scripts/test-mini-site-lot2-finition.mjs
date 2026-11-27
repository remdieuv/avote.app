/**
 * Lot 2 finition UX — typographie FR + graphiques évolution.
 * Exécution : node frontend/scripts/test-mini-site-lot2-finition.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatFrenchDisplayText } from "../lib/miniSiteUi.js";

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

const NNBSP = "\u202F";
const NBSP = "\u00A0";

test("formatFrenchDisplayText : espaces insécables avant ? ! : ; %", () => {
  assert.equal(
    formatFrenchDisplayText("Qui vient ?"),
    `Qui vient${NNBSP}?`,
  );
  assert.equal(
    formatFrenchDisplayText("Attention !"),
    `Attention${NNBSP}!`,
  );
  assert.equal(
    formatFrenchDisplayText("Note : ok"),
    `Note${NNBSP}: ok`,
  );
  assert.equal(
    formatFrenchDisplayText("A ; B"),
    `A${NNBSP}; B`,
  );
  assert.equal(
    formatFrenchDisplayText("50 %"),
    `50${NBSP}%`,
  );
  assert.equal(
    formatFrenchDisplayText("Quoi?"),
    `Quoi${NNBSP}?`,
  );
  assert.equal(
    formatFrenchDisplayText("« citation »"),
    `«${NBSP}citation${NBSP}»`,
  );
});

test("formatFrenchDisplayText : n’altère pas un texte sans ponctuation haute", () => {
  assert.equal(formatFrenchDisplayText("Bonjour"), "Bonjour");
  assert.equal(formatFrenchDisplayText(""), "");
  assert.equal(formatFrenchDisplayText(null), "");
});

test("liste + détail : formatFrenchDisplayText sur les questions", () => {
  const list = read("components/minisite/MiniSiteResultsList.jsx");
  const detail = read("components/minisite/MiniSiteResultDetail.jsx");
  assert.match(list, /formatFrenchDisplayText\(r\.question\)/);
  assert.match(detail, /formatFrenchDisplayText\(result\.question\)/);
  assert.doesNotMatch(list, /prisma|UPDATE.*question/i);
});

test("graphiques : axes, grille, points, tooltip, mobile", () => {
  const charts = read("components/minisite/MiniSiteResultsCharts.jsx");
  assert.match(charts, /ms-r-tick/);
  assert.match(charts, /ms-r-tooltip/);
  assert.match(charts, /onPointerMove|onPointerDown/);
  assert.match(charts, /buildYTicks|yTickFormat/);
  assert.match(charts, /ms-r-tooltip--start|ms-r-tooltip--end/);
  assert.match(charts, /tooltipAlign/);
  assert.match(charts, /max-width:\s*calc\(100% - 16px\)/);
  assert.match(charts, /strokeDasharray|#e2e8f0/);
  assert.match(charts, /<circle/);
  assert.match(charts, /offsetIdenticalSeries|se superposent/);
  assert.match(charts, /yMax.*100|rawMax > 100/);
  assert.match(charts, /matchMedia|narrow/);
  assert.doesNotMatch(charts, /max-height:\s*min\(280px/);
});

test("détail : un seul point d’historique géré ; modes cumulé/période conservés", () => {
  const detail = read("components/minisite/MiniSiteResultDetail.jsx");
  assert.match(detail, /Une seule période disponible/);
  assert.match(detail, /historyPoints\.length >= 1/);
  assert.match(detail, /Cumulé/);
  assert.match(detail, /Par période/);
  assert.match(detail, /overflow-x:\s*clip/);
});

test("pas de migration / régie / moteur de vote", () => {
  const charts = read("components/minisite/MiniSiteResultsCharts.jsx");
  assert.doesNotMatch(charts, /prisma|migrate|submitVote/);
  const regie = read("app/admin/event/[eventId]/page.jsx");
  assert.doesNotMatch(
    regie,
    /formatFrenchDisplayText|MiniSiteResultsCharts/,
  );
});

if (failed > 0) {
  console.error(`\n${failed} test(s) échoué(s)`);
  process.exit(1);
}
console.log("\nTous les tests Lot 2 finition UX OK");
