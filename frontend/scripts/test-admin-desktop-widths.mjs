/**
 * Largeurs desktop admin — cadre unique 1440 sur toutes les pages shellées.
 * Exécution : node frontend/scripts/test-admin-desktop-widths.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CLASSIC_CONTENT_MAX } from "../lib/classicLayout.js";
import {
  ADMIN_CONTENT_MAX_FORM_NARROW,
  ADMIN_CONTENT_MAX_STANDARD,
  ADMIN_CONTENT_MAX_WORKSPACE,
  ADMIN_CONTENT_PADDING,
  adminContentMaxWidth,
  adminContentShellStyle,
} from "../lib/adminLayout.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

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

/** @param {string} rel */
function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

test("Tokens workspace unifié 1440 (+ formNarrow)", () => {
  assert.equal(CLASSIC_CONTENT_MAX, 1440);
  assert.equal(ADMIN_CONTENT_MAX_WORKSPACE, 1440);
  assert.equal(ADMIN_CONTENT_MAX_STANDARD, 1440);
  assert.equal(ADMIN_CONTENT_MAX_FORM_NARROW, 640);
  assert.equal(adminContentMaxWidth("workspace"), "1440px");
  assert.equal(adminContentMaxWidth("standard"), "1440px");
  assert.equal(adminContentMaxWidth(), "1440px");
  assert.match(String(ADMIN_CONTENT_PADDING), /clamp\(/);
});

test("adminContentShellStyle cadre toujours 1440", () => {
  const s = adminContentShellStyle("workspace", { fontFamily: "system-ui" });
  assert.equal(s.maxWidth, "1440px");
  assert.equal(s.margin, "0 auto");
  assert.equal(s.width, "100%");
  assert.equal(s.boxSizing, "border-box");
  assert.equal(s.fontFamily, "system-ui");
  assert.equal(adminContentShellStyle("standard").maxWidth, "1440px");
});

test("Header admin branche sur workspace 1440", () => {
  const bar = read("components/admin/AdminAccountBar.jsx");
  assert.match(bar, /ADMIN_CONTENT_MAX_WORKSPACE/);
  assert.match(bar, /contentMaxWidth=\{ADMIN_CONTENT_MAX_WORKSPACE\}/);
  const shell = read("components/navigation/AppHeaderShell.jsx");
  assert.match(shell, /contentMaxWidth\s*=\s*1440/);
  assert.match(shell, /contentMaxWidth/);
});

test("Pages admin shellées à 1440 (pas de rail 1200/1280/1600)", () => {
  const files = [
    "app/admin/events/page.js",
    "app/admin/leads/page.jsx",
    "app/admin/analytics/page.jsx",
    "app/admin/event/[eventId]/leads/page.jsx",
    "app/admin/event/[eventId]/analytics/page.jsx",
    "app/admin/events/[eventId]/customization/page.jsx",
    "app/admin/page.js",
    "app/admin/account/page.jsx",
  ];
  for (const f of files) {
    const src = read(f);
    if (f === "app/admin/page.js") {
      assert.match(src, /adminContentMaxWidth/, `${f} shell via token`);
      assert.match(src, /max-width:\s*\$\{adminContentMaxWidth/);
      assert.doesNotMatch(
        src,
        /admin-create-form-rail|max-width:\s*1600px|max-width:\s*1280px|max-width:\s*1200px/,
      );
      continue;
    }
    if (f === "app/admin/account/page.jsx") {
      assert.match(src, /AdminContentShell/);
      assert.doesNotMatch(
        src,
        /AdminFormRail|adminFormRailStyle|maxWidth:\s*"1200px"|maxWidth:\s*"1280px"|maxWidth:\s*"1600px"/,
      );
      assert.match(src, /ADMIN_CONTENT_MAX_FORM_NARROW/);
      continue;
    }
    assert.match(
      src,
      /adminContent(?:MaxWidth|ShellStyle)/,
      `${f} doit importer adminLayout`,
    );
    assert.doesNotMatch(
      src,
      /maxWidth:\s*"1200px"|max-width:\s*1200px|maxWidth:\s*"1280px"|max-width:\s*1280px|maxWidth:\s*"1600px"|max-width:\s*1600px/,
      `${f} ne doit plus fixer d’anciens plafonds en dur pour le shell`,
    );
  }
  const custom = read("app/admin/events/[eventId]/customization/page.jsx");
  assert.match(custom, /adminContentMaxWidth\("workspace"\)/);
  assert.match(
    custom,
    /gridTemplateColumns:\s*"minmax\(340px, 42%\) minmax\(320px, 1fr\)"/,
  );
  assert.doesNotMatch(custom, /maxWidth:\s*"980px"/);
});

test("Création : grille élargie ≥1280 / ≥1440", () => {
  const create = read("app/admin/page.js");
  assert.match(create, /minmax\(360px, 420px\)/);
  assert.match(create, /minmax\(380px, 460px\)/);
  assert.match(create, /@media \(min-width: 1440px\)/);
});

test("Compte : grilles overview / payments desktop", () => {
  const account = read("app/admin/account/page.jsx");
  assert.match(account, /account-overview-grid/);
  assert.match(account, /account-payments-grid/);
});

test("Plus de AdminFormRail / adminFormRailStyle", () => {
  const shell = read("components/admin/AdminContentShell.jsx");
  assert.doesNotMatch(shell, /AdminFormRail|adminFormRailStyle/);
  const layout = read("lib/adminLayout.js");
  assert.doesNotMatch(layout, /adminFormRailStyle/);
});

test("Leads événement utilise AdminPageHeader + padding token", () => {
  const leads = read("app/admin/event/[eventId]/leads/page.jsx");
  assert.match(leads, /AdminPageHeader/);
  assert.doesNotMatch(leads, /padding:\s*"24px 16px 40px"/);
});

test("Admin interne aligné workspace 1440", () => {
  const internal = read("components/internal-admin/InternalAdminShell.jsx");
  assert.match(internal, /ADMIN_CONTENT_MAX_WORKSPACE/);
  assert.doesNotMatch(
    internal,
    /maxWidth:\s*"1200px"|maxWidth:\s*"1280px"|maxWidth:\s*"1600px"/,
  );
});

test("Régie sans plafond 1200/1280/1440/1600 de shell page", () => {
  const regie = read("app/admin/event/[eventId]/page.jsx");
  assert.doesNotMatch(regie, /adminContent(?:MaxWidth|ShellStyle|FormRail)/);
  assert.doesNotMatch(regie, /classicLayout|marketingLayout/);
  assert.doesNotMatch(
    regie,
    /maxWidth:\s*"1200px"|maxWidth:\s*"1280px"|maxWidth:\s*"1440px"|maxWidth:\s*"1600px"/,
  );
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll admin desktop width tests passed.");
