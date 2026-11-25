/**
 * Correctifs post-#90 — sélection SS, modal résultats, copy participant.
 * Exécution : node frontend/scripts/test-regie-ss-corrections.mjs
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getParticipantResultsBlockTitle } from "../lib/participantLiveFlow.js";

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

test("migration sélection SS présente", () => {
  const mig = join(
    backendRoot,
    "prisma/migrations/20261125120000_self_service_selected_poll_ids/migration.sql",
  );
  assert.ok(existsSync(mig));
  const sql = readFileSync(mig, "utf8");
  assert.match(sql, /selfServiceSelectedPollIds/);
  assert.doesNotMatch(sql, /DROP TABLE|DELETE FROM "Vote"/i);
});

test("backend restaure la sélection au retour SS", () => {
  const src = readFileSync(join(backendRoot, "server.js"), "utf8");
  assert.match(src, /snapshotSelfServiceSelectedPollIds/);
  assert.match(src, /buildRestoreSelfServicePollsPlan/);
  assert.match(src, /selfServiceSelectedPollIds/);
});

test("régie : join multi-polls + modal résultats", () => {
  const page = readFileSync(
    join(root, "app/admin/event/[eventId]/page.jsx"),
    "utf8",
  );
  assert.match(page, /pollIdsToJoin/);
  assert.match(page, /isSelfServiceMode\(eventData\)/);

  const ws = readFileSync(
    join(root, "components/admin/SelfServiceRegieWorkspace.jsx"),
    "utf8",
  );
  assert.match(ws, /SelfServiceResultsModal/);
  assert.doesNotMatch(ws, /href=\{`\/p\//);

  assert.ok(
    existsSync(join(root, "components/admin/SelfServiceResultsModal.jsx")),
  );
});

test("participant SS : progression + pause + résultats actuels", () => {
  const joinSrc = readFileSync(
    join(root, "components/JoinLiveHub.jsx"),
    "utf8",
  );
  assert.match(joinSrc, /répondue/);
  assert.match(joinSrc, /selfServiceHub/);
  assert.match(joinSrc, /shouldJoinApplyEventLivePollSnapshot/);
  assert.match(joinSrc, /resolveJoinPollRoomAfterEventLive/);
  assert.match(joinSrc, /pinnedPollId=\{selectedSelfServicePollId\}/);

  const catalog = readFileSync(
    join(root, "components/SelfServiceJoinCatalog.jsx"),
    "utf8",
  );
  assert.match(catalog, /Consultation en pause/);
  assert.match(catalog, /Répondu/);
  assert.doesNotMatch(catalog, /Ouvrir en page dédiée/);
  assert.doesNotMatch(catalog, /modifier si autorisé/);
  assert.doesNotMatch(catalog, /Ça va bientôt commencer/);

  const pollSrc = readFileSync(
    join(root, "components/PollExperience.jsx"),
    "utf8",
  );
  assert.match(pollSrc, /shouldApplyEventLivePollToExperience/);
  assert.match(pollSrc, /!selfServiceModePoll/);
  assert.match(pollSrc, /pinnedPollId/);

  assert.equal(
    getParticipantResultsBlockTitle({ consultationPaused: true }),
    "Résultats actuels",
  );
});

test("vote SS émet event_live_updated (sync régie) sans poll antenne", () => {
  const src = readFileSync(join(backendRoot, "server.js"), "utf8");
  assert.match(
    src,
    /SELF_SERVICE[\s\S]{0,200}emitEventLiveUpdated/,
  );
  assert.match(src, /ssLive/);
  assert.match(src, /initialPollStatus = eventIsSelfService \? "DRAFT"/);
  assert.match(src, /isSelfServicePublicPollStatus/);
});

test("régie SS : pas de télécommande Vote fermé", () => {
  const page = readFileSync(
    join(root, "app/admin/event/[eventId]/page.jsx"),
    "utf8",
  );
  assert.match(
    page,
    /useTelecommandeChrome =\s*\n?\s*!isSelfServiceRegie &&/,
  );
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll regie-ss-corrections FE tests passed.");
