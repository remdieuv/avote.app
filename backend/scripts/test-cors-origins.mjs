/**
 * Allowlist CORS — origines autorisées / refusées.
 * Exécution : node backend/scripts/test-cors-origins.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  isAllowedCorsOrigin,
  corsOriginCallback,
} = require("../lib/corsOrigins.js");

const CLIENT = "https://www.avote.app";
const opts = { clientUrl: CLIENT };

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

/** @param {string | undefined} origin @returns {boolean} */
function callbackAllowsSync(origin) {
  /** @type {boolean | undefined} */
  let allow;
  /** @type {Error | null} */
  let err = null;
  corsOriginCallback(
    origin,
    (e, a) => {
      err = e;
      allow = Boolean(a);
    },
    opts,
  );
  if (err) throw err;
  return Boolean(allow);
}

test("localhost:3000 autorisé", () => {
  assert.equal(isAllowedCorsOrigin("http://localhost:3000", opts), true);
});

test("127.0.0.1:3000 autorisé", () => {
  assert.equal(isAllowedCorsOrigin("http://127.0.0.1:3000", opts), true);
});

test("CLIENT_URL www.avote.app autorisé", () => {
  assert.equal(isAllowedCorsOrigin("https://www.avote.app", opts), true);
});

test("CLIENT_URL avec slash final normalisé via exact origin only — refusé si path", () => {
  assert.equal(
    isAllowedCorsOrigin("https://www.avote.app/", opts),
    false,
  );
});

test("avote-app.vercel.app autorisé (https)", () => {
  assert.equal(
    isAllowedCorsOrigin("https://avote-app.vercel.app", opts),
    true,
  );
});

test("Preview AVOTE remdieuvs-projects autorisé", () => {
  assert.equal(
    isAllowedCorsOrigin(
      "https://avote-mvdee3ua4-remdieuvs-projects.vercel.app",
      opts,
    ),
    true,
  );
});

test("Autre hash Preview AVOTE autorisé", () => {
  assert.equal(
    isAllowedCorsOrigin(
      "https://avote-abc123xyz-remdieuvs-projects.vercel.app",
      opts,
    ),
    true,
  );
});

test("http://avote-app.vercel.app refusé (https requis)", () => {
  assert.equal(
    isAllowedCorsOrigin("http://avote-app.vercel.app", opts),
    false,
  );
});

test("Autre projet Vercel refusé", () => {
  assert.equal(
    isAllowedCorsOrigin(
      "https://other-app-remdieuvs-projects.vercel.app",
      opts,
    ),
    false,
  );
});

test("vercel.app générique refusé", () => {
  assert.equal(isAllowedCorsOrigin("https://foo.vercel.app", opts), false);
});

test("Préfixe avote sans suffixe projet refusé", () => {
  assert.equal(
    isAllowedCorsOrigin("https://avote-foo.vercel.app", opts),
    false,
  );
});

test("Suffixe trompeur refusé", () => {
  assert.equal(
    isAllowedCorsOrigin(
      "https://avote-x-remdieuvs-projects.vercel.app.evil.com",
      opts,
    ),
    false,
  );
});

test("evil.example refusé", () => {
  assert.equal(isAllowedCorsOrigin("https://evil.example", opts), false);
});

test("apex avote.app refusé (hors allowlist ; CLIENT_URL = www)", () => {
  assert.equal(isAllowedCorsOrigin("https://avote.app", opts), false);
});

test("origin vide / null refusé par isAllowedCorsOrigin", () => {
  assert.equal(isAllowedCorsOrigin("", opts), false);
  assert.equal(isAllowedCorsOrigin(null, opts), false);
  assert.equal(isAllowedCorsOrigin(undefined, opts), false);
});

test("sans CLIENT_URL : www non autorisé, preview oui", () => {
  assert.equal(
    isAllowedCorsOrigin("https://www.avote.app", { clientUrl: null }),
    false,
  );
  assert.equal(
    isAllowedCorsOrigin("https://avote-app.vercel.app", { clientUrl: null }),
    true,
  );
});

test("callback : pas d’Origin → allow (non-browser)", () => {
  assert.equal(callbackAllowsSync(undefined), true);
});

test("callback : preview autorisée", () => {
  assert.equal(
    callbackAllowsSync(
      "https://avote-mvdee3ua4-remdieuvs-projects.vercel.app",
    ),
    true,
  );
});

test("callback : origine tierce refusée", () => {
  assert.equal(callbackAllowsSync("https://evil.example"), false);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests CORS origins OK");
