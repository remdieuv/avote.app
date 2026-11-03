/**
 * Non-régression React #310 — hooks Landing `/e/[slug]` avant early returns.
 * Cause PR #41 : `useMemo(showcaseLightboxPhotos)` après `if (loading) return`.
 * Exécution : node frontend/scripts/test-landing-react310-hooks.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const page = readFileSync(join(root, "app/e/[slug]/page.jsx"), "utf8");
const feedUi = readFileSync(
  join(root, "components/event/LandingHybridFeed.jsx"),
  "utf8",
);
const lightbox = readFileSync(
  join(root, "components/event/LandingPhotoLightbox.jsx"),
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

/**
 * Extrait le corps de `EventLandingPage` et vérifie qu’aucun hook
 * n’apparaît après le premier early return de rendu (`if (!slug) {`).
 * @param {string} src
 */
export function assertNoHooksAfterLandingEarlyReturns(src) {
  const start = src.indexOf("export default function EventLandingPage");
  assert.ok(start >= 0, "EventLandingPage introuvable");
  const body = src.slice(start);
  // Premier early return de rendu (pas le `if (!slug) return` dans useEffect)
  const earlyMatch = body.match(/\n  if \(!slug\) \{\s*\n\s*return \(/);
  assert.ok(earlyMatch && earlyMatch.index != null, "early return !slug manquant");
  const before = body.slice(0, earlyMatch.index);
  const after = body.slice(earlyMatch.index);

  assert.match(
    before,
    /showcaseLightboxPhotos\s*=\s*useMemo/,
    "showcaseLightboxPhotos doit être déclaré AVANT if (!slug)",
  );
  assert.match(before, /const accent = useMemo/);

  const hookAfter = after.match(
    /\buse(?:Memo|State|Effect|Callback|Ref|LayoutEffect|ImperativeHandle|Reducer|Context)\s*\(/,
  );
  assert.equal(
    hookAfter,
    null,
    `Hook après early return rendu : ${hookAfter ? hookAfter[0] : ""}`,
  );

  // Garde-fous explicites sur les chemins loading / erreur
  const loadingIdx = body.search(/\n  if \(loading\) \{/);
  const lightboxMemoIdx = body.search(/showcaseLightboxPhotos\s*=\s*useMemo/);
  assert.ok(loadingIdx > 0 && lightboxMemoIdx > 0);
  assert.ok(
    lightboxMemoIdx < loadingIdx,
    "useMemo lightbox doit précéder if (loading)",
  );
}

test("page /e : aucun hook après early returns (anti React #310)", () => {
  assertNoHooksAfterLandingEarlyReturns(page);
});

test("page /e : grille + lightbox conservées", () => {
  assert.match(page, /LandingPhotoLightbox/);
  assert.match(page, /showcaseLightboxIndex/);
  assert.match(feedUi, /ev-landing-feed-list/);
  assert.match(feedUi, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(0,\s*1fr\)/);
  assert.match(lightbox, /landing-photo-lightbox/);
});

test("LandingHybridFeed : hooks avant return null", () => {
  const fnStart = feedUi.indexOf("export function LandingHybridFeed");
  assert.ok(fnStart >= 0);
  const body = feedUi.slice(fnStart);
  const memoIdx = body.search(/useMemo\s*\(/);
  const stateIdx = body.search(/useState\s*\(/);
  const earlyIdx = body.search(/if\s*\(\s*!hasItems\s*&&\s*!headerAction\s*&&\s*!emptyHint\s*\)\s*return\s+null/);
  assert.ok(memoIdx >= 0 && stateIdx >= 0 && earlyIdx >= 0);
  assert.ok(memoIdx < earlyIdx, "useMemo avant early return");
  assert.ok(stateIdx < earlyIdx, "useState avant early return");
});

test("LandingPhotoLightbox : hooks avant return null", () => {
  const fnStart = lightbox.indexOf("export function LandingPhotoLightbox");
  assert.ok(fnStart >= 0);
  const body = lightbox.slice(fnStart);
  const effectIdx = body.search(/useEffect\s*\(/);
  const earlyIdx = body.search(/if\s*\(\s*!open\s*\|\|\s*!current\s*\)\s*return\s+null/);
  assert.ok(effectIdx >= 0 && earlyIdx >= 0);
  assert.ok(effectIdx < earlyIdx, "useEffect avant early return");
});

if (failed > 0) {
  console.error(`\n${failed} test(s) échoué(s)`);
  process.exit(1);
}
console.log("\nTous les tests anti React #310 Landing OK");
