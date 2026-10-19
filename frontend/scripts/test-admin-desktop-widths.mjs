/**
 * Largeurs desktop admin (cadre 1600 / rail formulaires 1200).
 * Exécution : node frontend/scripts/test-admin-desktop-widths.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ADMIN_CONTENT_MAX_FORM_NARROW,
  ADMIN_CONTENT_MAX_STANDARD,
  ADMIN_CONTENT_MAX_WORKSPACE,
  adminContentMaxWidth,
  adminContentShellStyle,
  adminFormRailStyle,
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

test("Tokens workspace / standard / formNarrow", () => {
  assert.equal(ADMIN_CONTENT_MAX_WORKSPACE, 1600);
  assert.equal(ADMIN_CONTENT_MAX_STANDARD, 1200);
  assert.equal(ADMIN_CONTENT_MAX_FORM_NARROW, 640);
  assert.equal(adminContentMaxWidth("workspace"), "1600px");
  assert.equal(adminContentMaxWidth("standard"), "1200px");
  assert.equal(adminContentMaxWidth(), "1600px");
});

test("adminContentShellStyle cadre toujours 1600", () => {
  const s = adminContentShellStyle("workspace", { fontFamily: "system-ui" });
  assert.equal(s.maxWidth, "1600px");
  assert.equal(s.margin, "0 auto");
  assert.equal(s.width, "100%");
  assert.equal(s.boxSizing, "border-box");
  assert.equal(s.fontFamily, "system-ui");
  // tier « standard » ne réduit plus le cadre (rail séparé)
  assert.equal(adminContentShellStyle("standard").maxWidth, "1600px");
});

test("adminFormRailStyle rail formulaire 1200", () => {
  const r = adminFormRailStyle({ padding: 0 });
  assert.equal(r.maxWidth, "1200px");
  assert.equal(r.margin, "0 auto");
  assert.equal(r.width, "100%");
  assert.equal(r.padding, 0);
});

test("Header admin branche sur workspace 1600", () => {
  const bar = read("components/admin/AdminAccountBar.jsx");
  assert.match(bar, /ADMIN_CONTENT_MAX_WORKSPACE/);
  assert.match(bar, /contentMaxWidth=\{ADMIN_CONTENT_MAX_WORKSPACE\}/);
  const shell = read("components/navigation/AppHeaderShell.jsx");
  assert.match(shell, /contentMaxWidth\s*=\s*1200/);
  assert.match(shell, /contentMaxWidth/);
});

test("Pages workspace utilisent 1600 (pas 1200 en dur pour le shell)", () => {
  const files = [
    "app/admin/events/page.js",
    "app/admin/leads/page.jsx",
    "app/admin/analytics/page.jsx",
    "app/admin/event/[eventId]/leads/page.jsx",
    "app/admin/event/[eventId]/analytics/page.jsx",
    "app/admin/events/[eventId]/customization/page.jsx",
  ];
  for (const f of files) {
    const src = read(f);
    assert.match(
      src,
      /adminContent(?:MaxWidth|ShellStyle)/,
      `${f} doit importer adminLayout`,
    );
    assert.doesNotMatch(
      src,
      /maxWidth:\s*"1200px"|max-width:\s*1200px/,
      `${f} ne doit plus fixer 1200px en dur pour le shell`,
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

test("Création + compte : cadre 1600 + rail 1200", () => {
  const create = read("app/admin/page.js");
  assert.match(create, /admin-create-form-rail/);
  assert.match(create, /max-width:\s*1600px/);
  assert.match(create, /\.admin-create-form-rail[\s\S]*max-width:\s*1200px/);

  const account = read("app/admin/account/page.jsx");
  assert.match(account, /AdminContentShell/);
  assert.match(account, /AdminFormRail/);
  assert.match(account, /ADMIN_CONTENT_MAX_FORM_NARROW/);
});

test("Leads événement utilise AdminPageHeader + padding token", () => {
  const leads = read("app/admin/event/[eventId]/leads/page.jsx");
  assert.match(leads, /AdminPageHeader/);
  assert.doesNotMatch(leads, /padding:\s*"24px 16px 40px"/);
});

test("Admin interne aligné workspace 1600", () => {
  const internal = read("components/internal-admin/InternalAdminShell.jsx");
  assert.match(internal, /ADMIN_CONTENT_MAX_WORKSPACE/);
  assert.doesNotMatch(internal, /maxWidth:\s*"1200px"/);
});

test("Régie sans plafond 1200/1600 de shell page", () => {
  const regie = read("app/admin/event/[eventId]/page.jsx");
  assert.doesNotMatch(regie, /adminContent(?:MaxWidth|ShellStyle|FormRail)/);
  assert.doesNotMatch(
    regie,
    /maxWidth:\s*"1200px"|maxWidth:\s*"1600px"/,
  );
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll admin desktop width tests passed.");
