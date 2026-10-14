/**
 * Régie — barres stats pilotage / consultation (ordre stable).
 * Exécution : node frontend/scripts/test-regie-option-stats.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatRegieOptionStatMeta,
  getRegieOptionBarWidthPct,
  getRegieOptionStatBarStyles,
} from "../lib/regieOptionStats.js";

const here = dirname(fileURLToPath(import.meta.url));
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

test("format meta FR + clamp barre", () => {
  assert.equal(formatRegieOptionStatMeta({ voteCount: 3, pct: 50 }), "3 · 50%");
  assert.equal(getRegieOptionBarWidthPct(120), 100);
  assert.equal(getRegieOptionBarWidthPct(-5), 0);
  const styles = getRegieOptionStatBarStyles({ pct: 33.3, highlight: false });
  assert.equal(styles.fill.width, "33.3%");
  assert.equal(styles.fill.background, "#2563eb");
});

test("page.jsx : RegieOptionStatsList sur pilotage + consult", () => {
  const src = readFileSync(
    join(here, "../app/admin/event/[eventId]/page.jsx"),
    "utf8",
  );
  assert.ok(src.includes("function RegieOptionStatsList("));
  assert.ok(src.includes('keyPrefix="pilotage-stat"'));
  assert.ok(src.includes('keyPrefix="consult-stat"'));
  assert.ok(src.includes("getRegieOptionStatBarStyles"));

  const pilotageMemo = src.slice(
    src.indexOf("const activePilotageStatsOptions = useMemo"),
    src.indexOf("const activeQuizBonneReponseLabel"),
  );
  assert.ok(pilotageMemo.includes("Ordre stable"));
  assert.equal(pilotageMemo.includes(".sort("), false);

  const consultMemo = src.slice(
    src.indexOf("const selectedConsultOptions = useMemo"),
    src.indexOf("const activePilotageStatsOptions = useMemo"),
  );
  assert.ok(consultMemo.includes("Ordre stable"));
  assert.equal(consultMemo.includes(".sort("), false);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nOK — régie option stats bars");
