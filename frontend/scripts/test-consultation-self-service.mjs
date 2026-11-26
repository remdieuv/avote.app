/**
 * Libre-service étape 2 — garde-fous sources FE.
 * Exécution : node frontend/scripts/test-consultation-self-service.mjs
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  normalizeConsultationModeUi,
  isSelfServiceMode,
  isSelfServiceCatalogType,
  pollAllowsSelfServiceVote,
} from "../lib/consultationMode.js";

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

test("helpers mode / catalogue", () => {
  assert.equal(normalizeConsultationModeUi("SELF_SERVICE"), "self_service");
  assert.equal(isSelfServiceMode({ consultationMode: "self_service" }), true);
  assert.equal(isSelfServiceCatalogType("SINGLE_CHOICE"), true);
  assert.equal(isSelfServiceCatalogType("CONTEST_ENTRY"), false);
  assert.equal(
    pollAllowsSelfServiceVote({
      selfServiceVotable: true,
      status: "ACTIVE",
    }),
    true,
  );
});

test("composants / pages branchés", () => {
  const files = [
    "components/SelfServiceJoinCatalog.jsx",
    "components/admin/RegieModeSelector.jsx",
    "components/admin/SelfServiceRegieWorkspace.jsx",
    "components/JoinLiveHub.jsx",
    "components/PollExperience.jsx",
    "components/ScreenProjection.jsx",
    "app/admin/event/[eventId]/page.jsx",
  ];
  for (const rel of files) {
    const p = join(root, rel);
    assert.ok(existsSync(p), `missing ${rel}`);
  }
  const joinSrc = readFileSync(
    join(root, "components/JoinLiveHub.jsx"),
    "utf8",
  );
  assert.match(joinSrc, /SelfServiceJoinCatalog/);
  assert.match(joinSrc, /selfServiceHub/);
  assert.match(joinSrc, /catalogPolls/);

  const pollSrc = readFileSync(
    join(root, "components/PollExperience.jsx"),
    "utf8",
  );
  assert.match(pollSrc, /selfServiceVotable/);
  assert.match(pollSrc, /CONSULTATION_CLOSED/);
  assert.match(pollSrc, /consultationPausedSs/);

  const screenSrc = readFileSync(
    join(root, "components/ScreenProjection.jsx"),
    "utf8",
  );
  assert.match(screenSrc, /consultationMode === "self_service"/);
  assert.match(screenSrc, /Libre-service/);

  const regieSrc = readFileSync(
    join(root, "app/admin/event/[eventId]/page.jsx"),
    "utf8",
  );
  assert.match(regieSrc, /RegieTopBar/);
  assert.match(regieSrc, /SelfServiceRegieWorkspace/);
  assert.doesNotMatch(regieSrc, /ConsultationModePanel/);
  const topBar = readFileSync(
    join(root, "components/admin/RegieTopBar.jsx"),
    "utf8",
  );
  assert.match(topBar, /RegieModeSelector/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll consultation-self-service FE tests passed.");
