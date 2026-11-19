/**
 * Fluidité header auth — cache session, pending neutre, pas de double /auth/me.
 * Exécution : node frontend/scripts/test-header-auth-fluide.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
let failed = 0;

/** @param {string} rel */
function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

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

test("useAuthMe : cache module + seed/clear/invalidate + soft refresh", () => {
  const src = read("components/navigation/useAuthMe.js");
  assert.match(src, /sessionCache/);
  assert.match(src, /export function seedAuthSession/);
  assert.match(src, /export function clearAuthSession/);
  assert.match(src, /export function invalidateAuthSession/);
  assert.match(src, /export function refreshAuthSession/);
  assert.match(src, /AdminUserContext/);
  assert.match(src, /ready:\s*false/);
});

test("SiteHeader : pending → nav publique seule + status CTA", () => {
  const src = read("components/navigation/SiteHeader.jsx");
  assert.match(src, /ready\s*&&\s*isAuthed/);
  assert.match(src, /status\s*=\s*!ready\s*\?\s*["']pending["']/);
  assert.match(src, /status=\{status\}/);
  assert.doesNotMatch(src, /isAuthed=\{/);
});

test("HeaderAuthCta : pas de useAuthMe ; pending sans Se connecter", () => {
  const src = read("components/navigation/HeaderAuthCta.jsx");
  assert.doesNotMatch(src, /useAuthMe/);
  assert.match(src, /status\s*===\s*["']pending["']/);
  assert.match(src, /aria-busy/);
  assert.match(src, /Vérification de la session/);
  // « Se connecter » uniquement hors pending
  const pendingBlock = src.slice(
    src.indexOf('status === "pending"'),
    src.indexOf('status !== "authed"'),
  );
  assert.doesNotMatch(pendingBlock, /Se connecter/);
});

test("AdminAuthShell : seed/clear session cache", () => {
  const src = read("components/admin/AdminAuthShell.jsx");
  assert.match(src, /seedAuthSession/);
  assert.match(src, /clearAuthSession/);
});

test("Login : invalidate après succès", () => {
  const src = read("app/login/page.jsx");
  assert.match(src, /invalidateAuthSession/);
});

test("Régie non touchée", () => {
  const regie = read("app/admin/event/[eventId]/page.jsx");
  assert.doesNotMatch(regie, /useAuthMe|seedAuthSession|SiteHeader/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nOK — header auth fluide");
