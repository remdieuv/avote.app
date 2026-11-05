/**
 * Admin Landing — split-scroll desktop (remplace sticky #48/#49).
 * Exécution : node frontend/scripts/test-landing-admin-preview-sticky.mjs
 *
 * Cause persistante : sticky + scroll document → l’aperçu quitte le viewport.
 * Solution : shell 100dvh, formulaire overflow-y:auto, aperçu fixe (pas sticky).
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const page = readFileSync(
  join(root, "app/admin/events/[eventId]/customization/page.jsx"),
  "utf8",
);
const publicLanding = readFileSync(
  join(root, "app/e/[slug]/page.jsx"),
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

/** Extrait le bloc CSS desktop (min-width: 901px). */
function desktopCssBlock() {
  const m = page.match(
    /@media \(min-width: 901px\) \{([\s\S]*?)\n\s*\}[\s\n]*@media \(max-width: 900px\)/,
  );
  assert.ok(m, "bloc @media desktop introuvable");
  return m[1];
}

function resolveChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "google-chrome",
    "chromium",
    "chromium-browser",
    "/usr/local/bin/google-chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  for (const c of candidates) {
    if (c.startsWith("/") && existsSync(c)) return c;
    const which = spawnSync("which", [String(c)], { encoding: "utf8" });
    if (which.status === 0) return which.stdout.trim();
  }
  return null;
}

test("desktop : contrat split-scroll (pas de sticky)", () => {
  const css = desktopCssBlock();
  assert.match(css, /\.customization-shell\s*\{[^}]*height:\s*100dvh/s);
  assert.match(css, /\.customization-shell\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.customization-layout\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.customization-layout\s*\{[^}]*align-items:\s*stretch/s);
  assert.match(css, /\.customization-form-col\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(
    css,
    /\.customization-preview-col\s*\{[^}]*overflow:\s*hidden/s,
  );
  assert.match(
    css,
    /\.customization-preview-card\s*\{[^}]*position:\s*static/s,
  );
  assert.doesNotMatch(css, /position:\s*sticky/);
  // Aucune règle CSS sticky pour l’aperçu (mentions textuelles/commentaires OK).
  assert.doesNotMatch(
    page,
    /\.customization-preview-(?:card|col)\s*\{[^}]*position:\s*sticky/s,
  );
});

test("structure DOM : shell + colonnes + actions", () => {
  assert.match(page, /className="customization-shell"/);
  assert.match(page, /className="customization-shell-inner"/);
  assert.match(page, /className="customization-form-col"/);
  assert.match(page, /className="customization-preview-col"/);
  assert.match(page, /Ouvrir la landing publiée/);
  assert.match(page, /Enregistrer la landing/);
  assert.match(page, /customization-sticky-bar/);
  assert.match(
    page,
    /gridTemplateColumns:\s*"minmax\(340px, 42%\) minmax\(320px, 1fr\)"/,
  );
});

test("mobile : tabs + scroll document (pas de shell verrouillé)", () => {
  assert.match(page, /customization-mobile-tabs/);
  assert.match(
    page,
    /customization-layout\[data-mobile-panel="form"\] \.customization-preview-col/,
  );
  const mobile = page.match(
    /@media \(max-width: 900px\) \{([\s\S]*?)\n\s*\}[\s\n]*`\}<\/style>/,
  );
  assert.ok(mobile, "bloc mobile attendu");
  const css = mobile[1];
  assert.match(css, /\.customization-shell\s*\{[^}]*height:\s*auto/s);
  assert.match(css, /\.customization-shell\s*\{[^}]*overflow:\s*visible/s);
  assert.match(css, /\.customization-form-col[\s\S]*?overflow:\s*visible/);
});

test("pas de surface publique /e", () => {
  assert.doesNotMatch(page, /resolveEventLandingPhase/);
  assert.match(publicLanding, /LandingHybridFeed/);
});

/**
 * Simulation layout réelle (Chromium headless) :
 * formulaire long → scroll form ≠ scroll preview ; preview reste visible.
 */
test("simulation scroll : preview reste visible après scroll formulaire", () => {
  const chrome = resolveChrome();
  if (!chrome) {
    console.log(
      "skip — Chromium absent (contrat CSS déjà validé)",
    );
    return;
  }

  const dir = mkdtempSync(join(tmpdir(), "avote-split-scroll-"));
  const htmlPath = join(dir, "fixture.html");
  writeFileSync(
    htmlPath,
    `<!doctype html>
<html><head><meta charset="utf-8"/>
<style>
  html,body{margin:0;height:100%;}
  .customization-shell{height:100dvh;max-height:100dvh;overflow:hidden;display:flex;flex-direction:column;}
  .customization-shell-inner{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;padding:12px;padding-bottom:72px;box-sizing:border-box;}
  .customization-page-header{flex:0 0 auto;height:64px;background:#e2e8f0;}
  .customization-layout{flex:1 1 auto;min-height:0;overflow:hidden;display:grid;grid-template-columns:42% 1fr;gap:16px;align-items:stretch;}
  .customization-form-col{min-height:0;height:100%;overflow-y:auto;overscroll-behavior:contain;background:#fff;border:1px solid #cbd5e1;}
  .customization-preview-col{min-height:0;height:100%;overflow:hidden;display:flex;flex-direction:column;}
  .customization-preview-card{position:static;flex:1 1 auto;min-height:0;display:flex;flex-direction:column;overflow:hidden;background:#fff;border:1px solid #cbd5e1;}
  .customization-preview-frame{flex:1 1 auto;min-height:240px;background:#0f172a;color:#fff;overflow:auto;}
  .tall{height:2400px;padding:12px;}
</style></head><body>
<main class="customization-shell">
  <div class="customization-shell-inner">
    <div class="customization-page-header">header</div>
    <div class="customization-layout">
      <div class="customization-form-col" id="form"><div class="tall" id="form-tall">FORM</div></div>
      <div class="customization-preview-col">
        <div class="customization-preview-card">
          <div class="customization-preview-frame" id="preview">PREVIEW</div>
          <button type="button" id="open">Ouvrir la landing publiée</button>
        </div>
      </div>
    </div>
  </div>
</main>
<script>
  const form = document.getElementById('form');
  const preview = document.getElementById('preview');
  const before = preview.getBoundingClientRect();
  form.scrollTop = form.scrollHeight;
  const after = preview.getBoundingClientRect();
  const docScrolled = window.scrollY || document.documentElement.scrollTop;
  document.title = JSON.stringify({
    formScrollTop: form.scrollTop,
    formCanScroll: form.scrollHeight > form.clientHeight,
    previewTopBefore: Math.round(before.top),
    previewTopAfter: Math.round(after.top),
    previewStillVisible: after.top >= 0 && after.bottom > 80,
    documentScrollY: docScrolled,
    openVisible: !!document.getElementById('open')
  });
</script>
</body></html>`,
  );

  const profileDir = join(dir, "chrome-profile");
  const run = spawnSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      `--user-data-dir=${profileDir}`,
      "--window-size=1280,900",
      "--virtual-time-budget=5000",
      "--dump-dom",
      `file://${htmlPath}`,
    ],
    { encoding: "utf8", timeout: 25000, maxBuffer: 8_000_000 },
  );

  try {
    if (run.status !== 0) {
      throw new Error(
        `Chromium headless a échoué (${run.status}): ${String(run.stderr || "").slice(0, 400)}`,
      );
    }

    const titleMatch = run.stdout.match(/<title>(\{[\s\S]*?\})<\/title>/);
    assert.ok(titleMatch, "résultat simulation absent du DOM dump");
    const result = JSON.parse(titleMatch[1]);
    assert.equal(result.documentScrollY, 0, "le document ne doit pas scroller");
    assert.ok(result.formCanScroll, "le formulaire long doit pouvoir scroller");
    assert.ok(result.formScrollTop > 100, "le formulaire doit avoir scrollé");
    assert.equal(
      result.previewTopBefore,
      result.previewTopAfter,
      "l’aperçu ne doit pas bouger quand le formulaire scroll",
    );
    assert.ok(result.previewStillVisible, "l’aperçu doit rester visible");
    assert.ok(result.openVisible, "bouton ouvrir landing présent");
    console.log(`    simulation ${JSON.stringify(result)}`);
  } finally {
    try {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5 });
    } catch {
      /* profil Chrome parfois encore verrouillé — non bloquant */
    }
  }
});

test("hint message organisateur conservé", () => {
  assert.match(page, /photo directement/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll landing-admin-preview-sticky tests passed.");
