/**
 * QR accès Télécommande mobile (orga) — helpers + présence UI.
 * Exécution : node frontend/scripts/test-telecommande-qr.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TELECOMMANDE_QR_COPY,
  buildTelecommandeAbsoluteUrl,
  buildTelecommandePath,
} from "../lib/telecommandeQr.js";

const here = dirname(fileURLToPath(import.meta.url));
const modalSrc = readFileSync(
  join(here, "../components/admin/TelecommandeQrModal.jsx"),
  "utf8",
);
const cardSrc = readFileSync(
  join(here, "../components/admin/EventDashboardCard.jsx"),
  "utf8",
);
const pageSrc = readFileSync(
  join(here, "../app/admin/event/[eventId]/page.jsx"),
  "utf8",
);
const authSrc = readFileSync(
  join(here, "../components/admin/AdminAuthShell.jsx"),
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

test("buildTelecommandePath — /admin/event/[eventId]", () => {
  assert.equal(buildTelecommandePath("abc-123"), "/admin/event/abc-123");
  assert.equal(
    buildTelecommandePath("a/b"),
    `/admin/event/${encodeURIComponent("a/b")}`,
  );
  assert.equal(buildTelecommandePath(""), "");
  assert.equal(buildTelecommandePath(null), "");
});

test("buildTelecommandeAbsoluteUrl — origin + path", () => {
  assert.equal(
    buildTelecommandeAbsoluteUrl({
      origin: "https://avote.app",
      eventId: "ev1",
    }),
    "https://avote.app/admin/event/ev1",
  );
  assert.equal(
    buildTelecommandeAbsoluteUrl({
      origin: "https://avote.app/",
      eventId: "ev1",
    }),
    "https://avote.app/admin/event/ev1",
  );
  assert.equal(
    buildTelecommandeAbsoluteUrl({ eventId: "ev1" }),
    "/admin/event/ev1",
  );
});

test("Copy — distingue organisateur du QR participation", () => {
  assert.equal(TELECOMMANDE_QR_COPY.title, "Télécommande mobile");
  assert.equal(TELECOMMANDE_QR_COPY.badge, "Organisateur");
  assert.equal(TELECOMMANDE_QR_COPY.audienceBadgeContrast, "Participation");
  assert.equal(TELECOMMANDE_QR_COPY.copyLabel, "Copier le lien");
  assert.match(TELECOMMANDE_QR_COPY.hint, /connect/i);
  assert.match(modalSrc, /TELECOMMANDE_QR_COPY\.badge/);
  assert.match(modalSrc, /TELECOMMANDE_QR_COPY\.audienceBadgeContrast/);
  assert.match(modalSrc, /TELECOMMANDE_QR_COPY\.copyLabel/);
  assert.match(modalSrc, /telecommande-qr-copy/);
  assert.match(modalSrc, /buildTelecommandeAbsoluteUrl/);
  assert.match(modalSrc, /telecommande-qr-modal/);
});

test("Mes événements — icône Télécommande sur carte", () => {
  assert.match(cardSrc, /TelecommandeQrModal/);
  assert.match(cardSrc, /event-card-telecommande-qr/);
  assert.match(cardSrc, /TELECOMMANDE_QR_COPY\.triggerAria/);
  assert.match(cardSrc, /canShowTelecommandeQr/);
  assert.match(cardSrc, /_localOnly/);
});

test("Régie desktop — bouton bandeau + modal accès", () => {
  assert.match(pageSrc, /regie-telecommande-qr-btn/);
  assert.match(pageSrc, /TELECOMMANDE_QR_COPY\.triggerButton/);
  assert.match(pageSrc, /telecommandeAccessQrOpen/);
  assert.match(pageSrc, /TelecommandeQrModal/);
  assert.match(pageSrc, /setTelecommandeAccessQrOpen\(true\)/);
  // Desktop only (pas mobile chrome)
  assert.match(pageSrc, /desktop \? \([\s\S]*?regie-telecommande-qr-btn/);
});

test("Auth existante réutilisée (AdminAuthShell → login?next=)", () => {
  assert.match(authSrc, /\/login\?next=/);
  assert.match(authSrc, /auth\/me/);
  // QR cible la route déjà protégée
  assert.equal(
    buildTelecommandePath("x"),
    "/admin/event/x",
  );
  assert.doesNotMatch(
    buildTelecommandePath("x"),
    /\/join\//,
  );
  assert.doesNotMatch(
    buildTelecommandePath("x"),
    /\/p\//,
  );
});

test("QR participant inchangé (PanneauQrParticipant distinct)", () => {
  assert.match(pageSrc, /function PanneauQrParticipant/);
  assert.match(pageSrc, /Accès audience/);
  assert.match(pageSrc, /telecommandeQrOpen/);
  assert.notEqual(
    "telecommandeQrOpen",
    "telecommandeAccessQrOpen",
  );
  assert.match(pageSrc, /telecommandeAccessQrOpen/);
});

if (failed > 0) {
  console.error(`\n${failed} test(s) en échec`);
  process.exit(1);
}
console.log(`\nOK — télécommande QR accès`);
