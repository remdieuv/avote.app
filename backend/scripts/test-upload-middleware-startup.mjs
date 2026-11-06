/**
 * Garde-fou démarrage : `uploadMiddleware` est déjà `.single("file")`.
 * Un appel `uploadMiddleware.single(...)` plante Express au chargement de server.js
 * (TypeError: uploadMiddleware.single is not a function) — cause outage PR #53.
 *
 * Exécution : node scripts/test-upload-middleware-startup.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const serverPath = path.join(path.dirname(require.resolve("../package.json")), "server.js");

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

test("uploadMiddleware est défini comme multer(...).single(\"file\")", () => {
  const src = fs.readFileSync(serverPath, "utf8");
  assert.match(
    src,
    /const uploadMiddleware\s*=\s*multer\(\{[\s\S]*?\}\)\s*\.single\(\s*["']file["']\s*\)\s*;/,
    "uploadMiddleware doit être le résultat de multer(...).single(\"file\")",
  );
});

test("aucun appel uploadMiddleware.single( (plante au boot)", () => {
  const src = fs.readFileSync(serverPath, "utf8");
  const hits = src.match(/uploadMiddleware\.single\s*\(/g) || [];
  assert.equal(
    hits.length,
    0,
    `Trouvé ${hits.length} appel(s) uploadMiddleware.single( — utiliser uploadMiddleware directement`,
  );
});

test("route image profil enregistre uploadMiddleware (pas .single)", () => {
  const src = fs.readFileSync(serverPath, "utf8");
  const idx = src.indexOf('/me/profiles/:profileId/image');
  assert.ok(idx >= 0, "route /me/profiles/:profileId/image absente");
  const window = src.slice(idx, idx + 500);
  assert.match(window, /uploadMiddleware\s*,/, "middleware upload manquant sur la route image");
  assert.doesNotMatch(
    window,
    /uploadMiddleware\.single\s*\(/,
    "la route image ne doit pas rappeler .single",
  );
});

test("node --check server.js (syntaxe)", () => {
  const r = spawnSync(process.execPath, ["--check", serverPath], {
    encoding: "utf8",
  });
  assert.equal(r.status, 0, r.stderr || r.stdout || "node --check failed");
});

/**
 * Charge un extrait isolé qui reproduirait le TypeError au boot si .single était rappelé.
 * Ne démarre pas le serveur HTTP.
 */
test("contrat runtime : middleware déjà single n’a pas de .single", () => {
  const multer = require("multer");
  const uploadMiddleware = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
  }).single("file");
  assert.equal(typeof uploadMiddleware, "function");
  assert.equal(typeof uploadMiddleware.single, "undefined");
  assert.throws(
    () => {
      // Reproduction du bug PR #53 au moment de l’enregistrement de route.
      const bogus = /** @type {any} */ (uploadMiddleware).single;
      if (typeof bogus !== "function") {
        throw new TypeError("uploadMiddleware.single is not a function");
      }
      bogus("file");
    },
    /uploadMiddleware\.single is not a function/,
  );
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log("\nTous les tests upload-middleware-startup OK");
