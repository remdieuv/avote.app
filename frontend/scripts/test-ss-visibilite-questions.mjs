/**
 * Libre-service — visibilité publique = selfServiceSelectedPollIds.
 * Exécution : node frontend/scripts/test-ss-visibilite-questions.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  buildSelfServiceCatalog,
  isSelfServicePubliclyVisiblePoll,
  canAcceptSelfServiceVote,
} = require("../../backend/lib/consultationMode.js");
const { getRegieSelfServicePlaylistBadge } = require("../lib/regieDesktopLayout.js");

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const backendRoot = join(here, "../../backend");

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

test("masquage : CLOSED décochée hors catalogue", () => {
  const catalog = buildSelfServiceCatalog({
    selfServiceOpen: true,
    selectedPollIds: ["keep"],
    polls: [
      {
        id: "keep",
        type: "SINGLE_CHOICE",
        status: "ACTIVE",
        question: "Visible",
        order: 0,
      },
      {
        id: "hidden",
        type: "SINGLE_CHOICE",
        status: "CLOSED",
        question: "Masquée après votes",
        order: 1,
      },
    ],
  });
  assert.deepEqual(
    catalog.map((p) => p.id),
    ["keep"],
  );
  assert.equal(
    isSelfServicePubliclyVisiblePoll({
      pollId: "hidden",
      pollType: "SINGLE_CHOICE",
      pollStatus: "CLOSED",
      selectedPollIds: ["keep"],
    }),
    false,
  );
});

test("réaffichage : sélection → visible + historique votable si ACTIVE", () => {
  const catalog = buildSelfServiceCatalog({
    selfServiceOpen: true,
    selectedPollIds: ["a", "b"],
    polls: [
      { id: "a", type: "SINGLE_CHOICE", status: "ACTIVE", question: "A", order: 0 },
      { id: "b", type: "QUIZ", status: "ACTIVE", question: "B", order: 1 },
    ],
  });
  assert.equal(catalog.length, 2);
  assert.equal(catalog.every((p) => p.votable), true);
});

test("vote bloqué si masquée même ACTIVE orpheline", () => {
  assert.equal(
    canAcceptSelfServiceVote({
      mode: "SELF_SERVICE",
      selfServiceOpen: true,
      pollStatus: "ACTIVE",
      pollType: "SINGLE_CHOICE",
      pollId: "x",
      selectedPollIds: [],
    }).code,
    "POLL_HIDDEN",
  );
});

test("pause consultation : sélectionnée reste visible, non votable", () => {
  const catalog = buildSelfServiceCatalog({
    selfServiceOpen: false,
    selectedPollIds: ["a"],
    polls: [
      { id: "a", type: "SINGLE_CHOICE", status: "ACTIVE", question: "A", order: 0 },
    ],
  });
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].open, false);
  assert.equal(catalog[0].votable, false);
});

test("toutes masquées → catalogue vide", () => {
  const catalog = buildSelfServiceCatalog({
    selfServiceOpen: true,
    selectedPollIds: [],
    polls: [
      { id: "a", type: "SINGLE_CHOICE", status: "CLOSED", question: "A", order: 0 },
    ],
  });
  assert.equal(catalog.length, 0);
});

test("API publique + sync socket : sélection passée au catalogue", () => {
  const server = readFileSync(join(backendRoot, "server.js"), "utf8");
  assert.match(server, /isSelfServicePubliclyVisiblePoll/);
  assert.match(server, /selectedPollIds:\s*eventApres\.selfServiceSelectedPollIds/);
  assert.match(server, /selectedPollIds:\s*decision\.pollIdsToActivate/);
  assert.match(server, /selectedPollIds:\s*event\.selfServiceSelectedPollIds/);
  assert.match(server, /selfServiceSelectedPollIds:\s*true/);
});

test("régie : libellés Visible / Masquée + compteur dynamiques", () => {
  assert.equal(
    getRegieSelfServicePlaylistBadge({ pollStatus: "ACTIVE" }),
    "Visible",
  );
  assert.equal(
    getRegieSelfServicePlaylistBadge({ pollStatus: "CLOSED" }),
    "Masquée",
  );
  const ws = readFileSync(
    join(root, "components/admin/SelfServiceRegieWorkspace.jsx"),
    "utf8",
  );
  assert.match(ws, /visibles/);
  assert.match(ws, /Décochez une question pour la masquer/);
  assert.match(ws, /selected \? "Visible" : "Masquée"/);
  assert.doesNotMatch(ws, /Sélectionnée/);
});

test("participant : redirect si masquée + état vide", () => {
  const joinSrc = readFileSync(
    join(root, "components/JoinLiveHub.jsx"),
    "utf8",
  );
  assert.match(joinSrc, /stillVisible/);
  assert.match(joinSrc, /handleBackToSelfServiceCatalog/);
  const cat = readFileSync(
    join(root, "components/SelfServiceJoinCatalog.jsx"),
    "utf8",
  );
  assert.match(cat, /self-service-no-visible-questions/);
  assert.match(cat, /Aucune question visible/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll ss-visibilite-questions FE tests passed.");
