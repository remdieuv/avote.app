/**
 * P2 — analytics page : chargement parallèle V1/V2, filtres V2 seuls.
 * Exécution : node frontend/scripts/test-analytics-perf-p2.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(
  join(here, "../app/admin/event/[eventId]/analytics/page.jsx"),
  "utf8",
);

let failed = 0;
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

test("mount : Promise.all V1+V2", () => {
  assert.match(src, /Promise\.all\(\[\s*adminFetch\(`\$\{apiBaseBrowser\(\)\}\/events\/\$\{eventId\}\/analytics`/);
  assert.match(src, /\/analytics\/v2/);
});

test("filtres : debounce V2 uniquement", () => {
  assert.match(src, /setTimeout/);
  assert.match(src, /filtersIdle/);
  assert.match(src, /analytics\/v2\$\{qs/);
});

if (failed) process.exit(1);
console.log("\nAll analytics-perf-p2 tests passed.");
