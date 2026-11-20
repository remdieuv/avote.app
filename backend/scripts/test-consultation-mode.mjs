/**
 * Libre-service étape 1 — mode consultation + migration.
 * Exécution : node backend/scripts/test-consultation-mode.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  CONSULTATION_MODE,
  SELF_SERVICE_EXCLUDED_TYPES,
  parseConsultationMode,
  normalizeConsultationMode,
  consultationModeApiFields,
  evaluateSetConsultationMode,
  evaluateOpenSelfServiceConsultation,
  evaluateCloseSelfServiceConsultation,
  buildNormalizeLivePollsPlan,
  isSelfServiceCatalogType,
  canAcceptSelfServiceVote,
  evaluateSetSelfServiceOpenPolls,
  buildSelfServiceCatalog,
} = require("../lib/consultationMode.js");

const here = dirname(fileURLToPath(import.meta.url));
const schema = join(here, "../prisma/schema.prisma");
const migSql = join(
  here,
  "../prisma/migrations/20261120140000_event_consultation_mode/migration.sql",
);
const serverJs = join(here, "../server.js");

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

test("LIVE par défaut + parse modes", () => {
  assert.equal(normalizeConsultationMode(null), CONSULTATION_MODE.LIVE);
  assert.equal(normalizeConsultationMode("live"), CONSULTATION_MODE.LIVE);
  assert.equal(
    parseConsultationMode("self_service"),
    CONSULTATION_MODE.SELF_SERVICE,
  );
  assert.equal(parseConsultationMode("nope"), null);
  assert.deepEqual(consultationModeApiFields({}), {
    consultationMode: "live",
    selfServiceOpen: false,
  });
  assert.deepEqual(
    consultationModeApiFields({
      consultationMode: "SELF_SERVICE",
      selfServiceOpen: true,
    }),
    { consultationMode: "self_service", selfServiceOpen: true },
  );
});

test("Schema Prisma : ConsultationMode + champs Event", () => {
  const s = readFileSync(schema, "utf8");
  assert.match(s, /enum ConsultationMode/);
  assert.match(s, /LIVE/);
  assert.match(s, /SELF_SERVICE/);
  assert.match(
    s,
    /consultationMode\s+ConsultationMode\s+@default\(LIVE\)/,
  );
  assert.match(s, /selfServiceOpen\s+Boolean\s+@default\(false\)/);
});

test("Migration additive présente (défaut LIVE)", () => {
  assert.equal(existsSync(migSql), true);
  const sql = readFileSync(migSql, "utf8");
  assert.match(sql, /CREATE TYPE "ConsultationMode"/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "consultationMode"/);
  assert.match(sql, /DEFAULT 'LIVE'/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS "selfServiceOpen"/);
  assert.doesNotMatch(sql, /DROP TABLE|DELETE FROM "Event"|DELETE FROM "Vote"/i);
});

test("Bascule LIVE → SELF_SERVICE ferme le vote, pas d’ouverture multi", () => {
  const d = evaluateSetConsultationMode({
    currentMode: "LIVE",
    nextMode: "self_service",
    isLocked: false,
    liveState: "WAITING",
  });
  assert.equal(d.ok, true);
  assert.equal(d.unchanged, false);
  assert.equal(d.normalizeLivePolls, false);
  assert.equal(d.eventData.consultationMode, "SELF_SERVICE");
  assert.equal(d.eventData.selfServiceOpen, false);
  assert.equal(d.eventData.voteState, "CLOSED");
});

test("Bascule SELF_SERVICE → LIVE : votes fermés + normalize polls", () => {
  const d = evaluateSetConsultationMode({
    currentMode: "SELF_SERVICE",
    nextMode: "LIVE",
    isLocked: false,
    liveState: "VOTING",
    selfServiceOpen: true,
  });
  assert.equal(d.ok, true);
  assert.equal(d.normalizeLivePolls, true);
  assert.equal(d.eventData.consultationMode, "LIVE");
  assert.equal(d.eventData.selfServiceOpen, false);
  assert.equal(d.eventData.voteState, "CLOSED");
});

test("Refus modification si isLocked / FINISHED", () => {
  const locked = evaluateSetConsultationMode({
    currentMode: "LIVE",
    nextMode: "SELF_SERVICE",
    isLocked: true,
  });
  assert.equal(locked.ok, false);
  assert.equal(locked.status, 403);

  const finished = evaluateSetConsultationMode({
    currentMode: "LIVE",
    nextMode: "self_service",
    isLocked: false,
    liveState: "FINISHED",
  });
  assert.equal(finished.ok, false);
  assert.equal(finished.status, 409);

  const bad = evaluateSetConsultationMode({
    currentMode: "LIVE",
    nextMode: "nope",
  });
  assert.equal(bad.ok, false);
  assert.equal(bad.status, 400);
});

test("Ouverture / fermeture réversible (≠ isLocked)", () => {
  const refuseLive = evaluateOpenSelfServiceConsultation({
    mode: "LIVE",
    selfServiceOpen: false,
  });
  assert.equal(refuseLive.ok, false);
  assert.equal(refuseLive.status, 409);

  const open = evaluateOpenSelfServiceConsultation({
    mode: "SELF_SERVICE",
    selfServiceOpen: false,
    isLocked: false,
  });
  assert.equal(open.ok, true);
  assert.equal(open.eventData.selfServiceOpen, true);

  const close = evaluateCloseSelfServiceConsultation({
    mode: "SELF_SERVICE",
    selfServiceOpen: true,
  });
  assert.equal(close.ok, true);
  assert.equal(close.eventData.selfServiceOpen, false);
  assert.equal(Object.prototype.hasOwnProperty.call(close.eventData, "isLocked"), false);

  const closeOnLive = evaluateCloseSelfServiceConsultation({
    mode: "LIVE",
    selfServiceOpen: false,
  });
  assert.equal(closeOnLive.ok, false);
});

test("Normalize LIVE : un seul ACTIVE, votes non touchés", () => {
  const plan = buildNormalizeLivePollsPlan({
    activePollId: "p2",
    polls: [
      { id: "p1", status: "ACTIVE", order: 0 },
      { id: "p2", status: "ACTIVE", order: 1 },
      { id: "p3", status: "DRAFT", order: 2 },
      { id: "p4", status: "ARCHIVED", order: 3 },
    ],
  });
  assert.equal(plan.activePollId, "p2");
  assert.deepEqual(plan.pollIdsToClose, ["p1"]);
});

test("Routes API branchées dans server.js (auth orga)", () => {
  const src = readFileSync(serverJs, "utf8");
  assert.match(src, /consultationModeApiFields/);
  assert.match(src, /\/events\/:eventId\/consultation-mode/);
  assert.match(src, /\/events\/:eventId\/consultation\/open/);
  assert.match(src, /\/events\/:eventId\/consultation\/close/);
  assert.match(src, /\/events\/:eventId\/consultation\/polls/);
  assert.match(src, /evaluateSetConsultationMode/);
  assert.match(src, /canAcceptSelfServiceVote/);
  assert.match(src, /buildSelfServiceCatalog/);
  assert.match(src, /votesPreserved:\s*true/);
  assert.match(src, /CONSULTATION_CLOSED/);
  // Non-régression : finish / start-real toujours là ; pas de wipe Vote dans ces routes mode.
  assert.match(src, /app\.post\("\/events\/:eventId\/finish"/);
  assert.match(src, /app\.post\("\/events\/:eventId\/start-real"/);
  assert.doesNotMatch(
    src,
    /consultation\/open[\s\S]{0,800}vote\.deleteMany/,
  );
});

test("Catalogue V1 : types exclus + multi ACTIVE", () => {
  assert.ok(SELF_SERVICE_EXCLUDED_TYPES.includes("CONTEST_ENTRY"));
  assert.equal(isSelfServiceCatalogType("SINGLE_CHOICE"), true);
  assert.equal(isSelfServiceCatalogType("MULTIPLE_CHOICE"), true);
  assert.equal(isSelfServiceCatalogType("QUIZ"), true);
  assert.equal(isSelfServiceCatalogType("CONTEST_ENTRY"), false);
  assert.equal(isSelfServiceCatalogType("WORD_CLOUD"), false);

  const catalog = buildSelfServiceCatalog({
    selfServiceOpen: true,
    polls: [
      { id: "a", type: "SINGLE_CHOICE", status: "ACTIVE", question: "Q1", order: 0 },
      { id: "b", type: "CONTEST_ENTRY", status: "ACTIVE", question: "Concours", order: 1 },
      { id: "c", type: "MULTIPLE_CHOICE", status: "DRAFT", question: "Q2", order: 2 },
      { id: "d", type: "QUIZ", status: "ACTIVE", question: "Quiz", order: 3 },
    ],
  });
  assert.equal(catalog.length, 3);
  assert.deepEqual(
    catalog.map((x) => x.id),
    ["a", "c", "d"],
  );
  assert.equal(catalog.find((x) => x.id === "a").votable, true);
  assert.equal(catalog.find((x) => x.id === "c").votable, false);
  assert.equal(catalog.find((x) => x.id === "d").votable, true);
});

test("canAcceptSelfServiceVote : open / fermé / type exclu", () => {
  assert.equal(
    canAcceptSelfServiceVote({
      mode: "SELF_SERVICE",
      selfServiceOpen: true,
      pollStatus: "ACTIVE",
      pollType: "SINGLE_CHOICE",
    }).ok,
    true,
  );
  assert.equal(
    canAcceptSelfServiceVote({
      mode: "SELF_SERVICE",
      selfServiceOpen: false,
      pollStatus: "ACTIVE",
      pollType: "SINGLE_CHOICE",
    }).code,
    "CONSULTATION_CLOSED",
  );
  assert.equal(
    canAcceptSelfServiceVote({
      mode: "LIVE",
      selfServiceOpen: true,
      pollStatus: "ACTIVE",
      pollType: "SINGLE_CHOICE",
    }).code,
    "NOT_SELF_SERVICE",
  );
  assert.equal(
    canAcceptSelfServiceVote({
      mode: "SELF_SERVICE",
      selfServiceOpen: true,
      pollStatus: "ACTIVE",
      pollType: "RANKING",
    }).code,
    "POLL_TYPE_EXCLUDED",
  );
});

test("evaluateSetSelfServiceOpenPolls : multi + rejet exclus", () => {
  const d = evaluateSetSelfServiceOpenPolls({
    mode: "SELF_SERVICE",
    polls: [
      { id: "a", status: "DRAFT", type: "SINGLE_CHOICE" },
      { id: "b", status: "ACTIVE", type: "MULTIPLE_CHOICE" },
      { id: "c", status: "DRAFT", type: "CONTEST_ENTRY" },
    ],
    requestedPollIds: ["a", "c", "ghost"],
  });
  assert.equal(d.ok, true);
  assert.deepEqual(d.pollIdsToActivate, ["a"]);
  assert.deepEqual(d.pollIdsToDeactivate, ["b"]);
  assert.ok(d.rejectedPollIds.includes("c"));
  assert.ok(d.rejectedPollIds.includes("ghost"));
});

test("Snapshot socket expose consultationMode", () => {
  const snap = join(
    here,
    "../lib/eventLiveSnapshot.js",
  );
  const src = readFileSync(snap, "utf8");
  assert.match(src, /consultationModeApiFields/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll consultation-mode tests passed.");
