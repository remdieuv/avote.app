/**
 * Visibilité publique des questions / résultats (surfaces Landing, mini-site, etc.).
 * Pure : pas d’I/O. Réutilise les helpers Libre-service (PR #95) sans les dupliquer.
 *
 * Les données non autorisées ne doivent jamais être sérialisées vers un client public.
 *
 * Libre-service (résultats landing) : ACTIVE | CLOSED si sélectionnées (#95),
 * y compris lorsque selfServiceOpen est false (consultation en pause).
 * Live : CLOSED uniquement pour le fil / résultats publiés.
 */

const {
  CONSULTATION_MODE,
  normalizeConsultationMode,
  isSelfServicePubliclyVisiblePoll,
  isSelfServicePublicPollStatus,
  normalizeSelfServiceSelectedPollIds,
} = require("./consultationMode");

/** Surfaces publiques réutilisables (Lot 0 + lots mini-site suivants). */
const PUBLIC_POLL_SURFACE = Object.freeze({
  POLL_PAGE: "poll_page",
  JOIN_CATALOG: "join_catalog",
  LANDING_FEED_RESULT: "landing_feed_result",
  JOURNAL_AUTO_RESULT: "journal_auto_result",
  MINISITE_RESULTS: "minisite_results",
  SHARE_RESULT: "share_result",
  PUBLIC_COUNTERS: "public_counters",
});

const RESULT_SURFACES = new Set([
  PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
  PUBLIC_POLL_SURFACE.JOURNAL_AUTO_RESULT,
  PUBLIC_POLL_SURFACE.MINISITE_RESULTS,
  PUBLIC_POLL_SURFACE.SHARE_RESULT,
  PUBLIC_POLL_SURFACE.PUBLIC_COUNTERS,
]);

/**
 * Surfaces de résultats « publiés » (fil / journal / mini-site / partage).
 * Live → CLOSED only ; Libre-service → ACTIVE | CLOSED (+ sélection #95).
 */
const PUBLISHED_RESULT_SURFACES = new Set([
  PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
  PUBLIC_POLL_SURFACE.JOURNAL_AUTO_RESULT,
  PUBLIC_POLL_SURFACE.MINISITE_RESULTS,
  PUBLIC_POLL_SURFACE.SHARE_RESULT,
]);

/**
 * Lead CRM pur : exclu des résultats publics (Concours peut apparaître).
 * Aligné historique `landingFeed.isLandingFeedLeadCrm`.
 * @param {{ type?: string | null; leadEnabled?: boolean | null } | null | undefined} poll
 */
function isPublicLeadCrmExcluded(poll) {
  if (!poll) return false;
  const type = String(poll.type || "").toUpperCase();
  if (type === "CONTEST_ENTRY") return false;
  return poll.leadEnabled === true;
}

/**
 * @param {unknown} surface
 * @returns {string}
 */
function normalizePublicPollSurface(surface) {
  const s = typeof surface === "string" ? surface.trim() : "";
  if (s && Object.values(PUBLIC_POLL_SURFACE).includes(s)) return s;
  return PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT;
}

/**
 * Clause Prisma `where` pour les polls du fil résultats landing.
 * SS : ACTIVE|CLOSED restreints aux IDs sélectionnés (#95).
 * Live : CLOSED uniquement.
 * @param {{
 *   id?: unknown;
 *   consultationMode?: unknown;
 *   selfServiceSelectedPollIds?: unknown;
 * } | null | undefined} event
 * @returns {Record<string, unknown>}
 */
function landingFeedResultPollsWhere(event) {
  const eventId =
    typeof event?.id === "string" ? event.id.trim() : String(event?.id || "").trim();
  const mode = normalizeConsultationMode(event?.consultationMode);

  if (mode === CONSULTATION_MODE.SELF_SERVICE) {
    const selected = normalizeSelfServiceSelectedPollIds(
      event?.selfServiceSelectedPollIds,
    );
    if (!eventId || selected.length === 0) {
      // Aucune sélection → aucun résultat public (évite un scan ACTIVE inutile).
      return { eventId: eventId || "__none__", id: { in: [] } };
    }
    return {
      eventId,
      status: { in: ["CLOSED", "ACTIVE"] },
      id: { in: selected },
    };
  }

  return {
    eventId: eventId || "__none__",
    status: "CLOSED",
  };
}

/**
 * Décide si un poll peut être exposé sur une surface publique.
 * Ne lit pas `selfServiceOpen` : la pause n’empêche pas la restitution des résultats.
 * @param {{
 *   event?: {
 *     consultationMode?: unknown;
 *     selfServiceSelectedPollIds?: unknown;
 *   } | null;
 *   poll?: {
 *     id?: unknown;
 *     status?: unknown;
 *     type?: unknown;
 *     leadEnabled?: unknown;
 *     landingResultHidden?: unknown;
 *   } | null;
 *   surface?: unknown;
 * }} input
 * @returns {boolean}
 */
function isPollPubliclyExposable(input = {}) {
  const event = input.event && typeof input.event === "object" ? input.event : {};
  const poll = input.poll && typeof input.poll === "object" ? input.poll : {};
  const surface = normalizePublicPollSurface(input.surface);
  const mode = normalizeConsultationMode(event.consultationMode);

  const pollId =
    typeof poll.id === "string" ? poll.id.trim() : String(poll.id || "").trim();
  if (!pollId) return false;

  const status = String(poll.status || "").toUpperCase();
  if (!status || status === "DRAFT" || status === "SCHEDULED" || status === "ARCHIVED") {
    return false;
  }

  if (RESULT_SURFACES.has(surface)) {
    if (PUBLISHED_RESULT_SURFACES.has(surface)) {
      if (mode === CONSULTATION_MODE.SELF_SERVICE) {
        // SS : questions sélectionnées restent ACTIVE même en pause.
        if (status !== "CLOSED" && status !== "ACTIVE") return false;
      } else if (status !== "CLOSED") {
        // Live : fil = résultats des questions fermées uniquement.
        return false;
      }
    } else if (surface === PUBLIC_POLL_SURFACE.PUBLIC_COUNTERS) {
      if (status !== "CLOSED" && status !== "ACTIVE") return false;
      // Live : compteurs publics futurs = même règle CLOSED-only que le fil.
      if (mode !== CONSULTATION_MODE.SELF_SERVICE && status !== "CLOSED") {
        return false;
      }
    }
    if (isPublicLeadCrmExcluded(poll)) return false;
    if (poll.landingResultHidden === true) return false;
  }

  if (mode === CONSULTATION_MODE.SELF_SERVICE) {
    // Source de vérité PR #95 : sélection persistante (indépendant de selfServiceOpen).
    return isSelfServicePubliclyVisiblePoll({
      pollId,
      pollType: poll.type,
      pollStatus: poll.status,
      selectedPollIds: event.selfServiceSelectedPollIds,
    });
  }

  // LIVE — catalogue / page poll : ACTIVE|CLOSED (hors DRAFT/ARCHIVED déjà exclus).
  if (
    surface === PUBLIC_POLL_SURFACE.POLL_PAGE ||
    surface === PUBLIC_POLL_SURFACE.JOIN_CATALOG
  ) {
    return isSelfServicePublicPollStatus(status);
  }

  // LIVE — résultats landing / mini-site : déjà filtré CLOSED + hidden + lead.
  return true;
}

/**
 * Filtre une liste de polls pour une surface publique.
 * @param {{
 *   event?: object | null;
 *   polls?: object[] | null;
 *   surface?: unknown;
 * }} input
 * @returns {object[]}
 */
function filterPollsForPublicSurface(input = {}) {
  const polls = Array.isArray(input.polls) ? input.polls : [];
  const surface = normalizePublicPollSurface(input.surface);
  const event = input.event;
  return polls.filter((poll) =>
    isPollPubliclyExposable({ event, poll, surface }),
  );
}

module.exports = {
  PUBLIC_POLL_SURFACE,
  isPublicLeadCrmExcluded,
  normalizePublicPollSurface,
  landingFeedResultPollsWhere,
  isPollPubliclyExposable,
  filterPollsForPublicSurface,
};
