/**
 * Libre-service — mode Event LIVE | SELF_SERVICE + ouverture réversible + catalogue.
 * Pure : pas d’I/O. Aucune purge de votes / slug.
 */

/** Types exclus du catalogue V1 (nécessitent une régie / FE incomplet). */
const SELF_SERVICE_EXCLUDED_TYPES = Object.freeze([
  "CONTEST_ENTRY",
  "OPEN_TEXT",
  "WORD_CLOUD",
  "RANKING",
]);


const CONSULTATION_MODE = Object.freeze({
  LIVE: "LIVE",
  SELF_SERVICE: "SELF_SERVICE",
});

/**
 * @param {unknown} raw
 * @returns {"LIVE" | "SELF_SERVICE" | null}
 */
function parseConsultationMode(raw) {
  if (typeof raw !== "string") return null;
  const u = raw.trim().toUpperCase().replace(/-/g, "_");
  if (u === "LIVE") return CONSULTATION_MODE.LIVE;
  if (u === "SELF_SERVICE" || u === "SELFSERVICE") {
    return CONSULTATION_MODE.SELF_SERVICE;
  }
  return null;
}

/**
 * @param {unknown} raw
 * @returns {"LIVE" | "SELF_SERVICE"}
 */
function normalizeConsultationMode(raw) {
  return parseConsultationMode(raw) || CONSULTATION_MODE.LIVE;
}

/**
 * Champs API (lowercase, aligné liveState / voteState).
 * @param {{ consultationMode?: unknown; selfServiceOpen?: unknown } | null | undefined} event
 */
function consultationModeApiFields(event) {
  const mode = normalizeConsultationMode(event?.consultationMode);
  return {
    consultationMode: mode === CONSULTATION_MODE.SELF_SERVICE ? "self_service" : "live",
    selfServiceOpen: Boolean(event?.selfServiceOpen),
  };
}

/**
 * @param {{
 *   isLocked?: unknown;
 *   liveState?: unknown;
 * }} [input]
 * @returns {{ ok: true } | { ok: false; status: number; error: string }}
 */
function assertConsultationModeMutable(input = {}) {
  if (Boolean(input.isLocked)) {
    return {
      ok: false,
      status: 403,
      error:
        "Événement verrouillé (terminé) : le mode de consultation ne peut plus être modifié.",
    };
  }
  if (String(input.liveState || "").toUpperCase() === "FINISHED") {
    return {
      ok: false,
      status: 409,
      error:
        "Événement terminé : rouvrez ou créez un nouvel événement pour changer de mode.",
    };
  }
  return { ok: true };
}

/**
 * Passage LIVE ↔ SELF_SERVICE (sans effacer votes / slug).
 * @param {{
 *   currentMode?: unknown;
 *   nextMode?: unknown;
 *   isLocked?: unknown;
 *   liveState?: unknown;
 *   selfServiceOpen?: unknown;
 * }} input
 * @returns {{
 *   ok: true;
 *   unchanged: boolean;
 *   eventData: Record<string, unknown>;
 *   normalizeLivePolls: boolean;
 * } | {
 *   ok: false;
 *   status: number;
 *   error: string;
 * }}
 */
function evaluateSetConsultationMode(input = {}) {
  const nextMode = parseConsultationMode(input.nextMode);
  if (!nextMode) {
    return {
      ok: false,
      status: 400,
      error: 'mode invalide : attendu "live" ou "self_service".',
    };
  }
  const mutable = assertConsultationModeMutable(input);
  if (!mutable.ok) return mutable;

  const current = normalizeConsultationMode(input.currentMode);
  if (current === nextMode) {
    return {
      ok: true,
      unchanged: true,
      eventData: {},
      normalizeLivePolls: false,
    };
  }

  if (nextMode === CONSULTATION_MODE.SELF_SERVICE) {
    return {
      ok: true,
      unchanged: false,
      eventData: {
        consultationMode: CONSULTATION_MODE.SELF_SERVICE,
        selfServiceOpen: false,
        voteState: "CLOSED",
      },
      normalizeLivePolls: false,
    };
  }

  // → LIVE : un seul sondage courant, votes fermés jusqu’à la régie.
  return {
    ok: true,
    unchanged: false,
    eventData: {
      consultationMode: CONSULTATION_MODE.LIVE,
      selfServiceOpen: false,
      voteState: "CLOSED",
    },
    normalizeLivePolls: true,
  };
}

/**
 * Ouvrir la consultation libre-service (réversible, ≠ isLocked).
 * Étape 1 : flag only — pas d’activation multi-sondages votables.
 * @param {{
 *   mode?: unknown;
 *   isLocked?: unknown;
 *   liveState?: unknown;
 *   selfServiceOpen?: unknown;
 * }} input
 */
function evaluateOpenSelfServiceConsultation(input = {}) {
  const mutable = assertConsultationModeMutable(input);
  if (!mutable.ok) return mutable;
  const mode = normalizeConsultationMode(input.mode);
  if (mode !== CONSULTATION_MODE.SELF_SERVICE) {
    return {
      ok: false,
      status: 409,
      error:
        "Passez d’abord en mode libre-service (self_service) avant d’ouvrir la consultation.",
    };
  }
  if (Boolean(input.selfServiceOpen)) {
    return {
      ok: true,
      unchanged: true,
      eventData: {},
    };
  }
  return {
    ok: true,
    unchanged: false,
    eventData: { selfServiceOpen: true },
  };
}

/**
 * Fermer la consultation libre-service (réversible).
 * @param {{
 *   mode?: unknown;
 *   isLocked?: unknown;
 *   liveState?: unknown;
 *   selfServiceOpen?: unknown;
 * }} input
 */
function evaluateCloseSelfServiceConsultation(input = {}) {
  if (Boolean(input.isLocked)) {
    return {
      ok: false,
      status: 403,
      error: "Événement verrouillé : fermeture libre-service inutile.",
    };
  }
  const mode = normalizeConsultationMode(input.mode);
  if (mode !== CONSULTATION_MODE.SELF_SERVICE) {
    return {
      ok: false,
      status: 409,
      error: "La fermeture de consultation s’applique uniquement en mode libre-service.",
    };
  }
  if (!Boolean(input.selfServiceOpen)) {
    return {
      ok: true,
      unchanged: true,
      eventData: {},
    };
  }
  return {
    ok: true,
    unchanged: false,
    eventData: { selfServiceOpen: false },
  };
}

/**
 * Normalise une liste d’IDs persistés (Json Prisma / body).
 * @param {unknown} raw
 * @returns {string[]}
 */
function normalizeSelfServiceSelectedPollIds(raw) {
  if (!Array.isArray(raw)) return [];
  return [
    ...new Set(
      raw
        .map((x) => String(x || "").trim())
        .filter(Boolean),
    ),
  ];
}

/**
 * Snapshot des questions actuellement ouvertes (ACTIVE) et éligibles SS.
 * @param {{
 *   polls?: Array<{ id?: unknown; status?: unknown; type?: unknown }> | null;
 * }} input
 * @returns {string[]}
 */
function snapshotSelfServiceSelectedPollIds(input = {}) {
  const polls = Array.isArray(input.polls) ? input.polls : [];
  /** @type {string[]} */
  const ids = [];
  for (const p of polls) {
    const id = typeof p?.id === "string" ? p.id.trim() : "";
    if (!id) continue;
    if (String(p?.status || "").toUpperCase() !== "ACTIVE") continue;
    if (!isSelfServiceCatalogType(p?.type)) continue;
    ids.push(id);
  }
  return ids;
}

/**
 * Plan de restauration des questions SS après un passage Live.
 * Ne touche pas les votes. Ignore les IDs archivés / exclus.
 * @param {{
 *   polls?: Array<{ id?: unknown; status?: unknown; type?: unknown }> | null;
 *   savedPollIds?: unknown;
 * }} input
 * @returns {{
 *   pollIdsToActivate: string[];
 *   pollIdsToDeactivate: string[];
 *   selectedPollIds: string[];
 * }}
 */
function buildRestoreSelfServicePollsPlan(input = {}) {
  const saved = normalizeSelfServiceSelectedPollIds(input.savedPollIds);
  const polls = Array.isArray(input.polls) ? input.polls : [];
  const byId = new Map();
  for (const p of polls) {
    const id = typeof p?.id === "string" ? p.id.trim() : "";
    if (!id) continue;
    byId.set(id, {
      id,
      status: String(p?.status || "").toUpperCase(),
      type: String(p?.type || "").toUpperCase(),
    });
  }

  /** @type {string[]} */
  const pollIdsToActivate = [];
  for (const id of saved) {
    const p = byId.get(id);
    if (!p || p.status === "ARCHIVED") continue;
    if (!isSelfServiceCatalogType(p.type)) continue;
    pollIdsToActivate.push(id);
  }

  /** @type {string[]} */
  const pollIdsToDeactivate = [];
  for (const p of byId.values()) {
    if (p.status !== "ACTIVE") continue;
    if (!isSelfServiceCatalogType(p.type)) continue;
    if (!pollIdsToActivate.includes(p.id)) {
      pollIdsToDeactivate.push(p.id);
    }
  }

  return {
    pollIdsToActivate,
    pollIdsToDeactivate,
    selectedPollIds: pollIdsToActivate,
  };
}

/**
 * Plan de normalisation playlist LIVE : au plus un poll ACTIVE.
 * Ne supprime aucun vote.
 * @param {{
 *   polls?: Array<{ id?: unknown; status?: unknown; order?: unknown }> | null;
 *   activePollId?: unknown;
 * }} input
 * @returns {{
 *   activePollId: string | null;
 *   pollIdsToClose: string[];
 * }}
 */
function buildNormalizeLivePollsPlan(input = {}) {
  const polls = Array.isArray(input.polls) ? input.polls : [];
  const ordered = [...polls]
    .map((p) => ({
      id: typeof p?.id === "string" ? p.id.trim() : "",
      status: String(p?.status || "").toUpperCase(),
      order: Number.isFinite(Number(p?.order)) ? Number(p.order) : 0,
    }))
    .filter((p) => p.id && p.status !== "ARCHIVED")
    .sort((a, b) => a.order - b.order);

  const wantedActive =
    typeof input.activePollId === "string" && input.activePollId.trim()
      ? input.activePollId.trim()
      : "";

  let keepId = null;
  if (wantedActive && ordered.some((p) => p.id === wantedActive)) {
    keepId = wantedActive;
  } else {
    const firstActive = ordered.find((p) => p.status === "ACTIVE");
    keepId = firstActive?.id || ordered[0]?.id || null;
  }

  /** @type {string[]} */
  const pollIdsToClose = [];
  for (const p of ordered) {
    if (p.status === "ACTIVE" && p.id !== keepId) {
      pollIdsToClose.push(p.id);
    }
  }

  return { activePollId: keepId, pollIdsToClose };
}

/**
 * @param {unknown} pollType
 * @returns {boolean}
 */
function isSelfServiceCatalogType(pollType) {
  const t = String(pollType || "").toUpperCase();
  if (!t) return false;
  if (SELF_SERVICE_EXCLUDED_TYPES.includes(t)) return false;
  return true;
}

/**
 * Vote libre-service autorisé ?
 * @param {{
 *   mode?: unknown;
 *   selfServiceOpen?: unknown;
 *   isLocked?: unknown;
 *   pollStatus?: unknown;
 *   pollType?: unknown;
 * }} input
 * @returns {{ ok: true } | { ok: false; code: string; message: string }}
 */
function canAcceptSelfServiceVote(input = {}) {
  if (Boolean(input.isLocked)) {
    return {
      ok: false,
      code: "EVENT_LOCKED",
      message: "Cet événement est terminé et ne peut plus accepter de votes.",
    };
  }
  if (normalizeConsultationMode(input.mode) !== CONSULTATION_MODE.SELF_SERVICE) {
    return {
      ok: false,
      code: "NOT_SELF_SERVICE",
      message: "Ce sondage n’est pas en libre-service.",
    };
  }
  if (!Boolean(input.selfServiceOpen)) {
    return {
      ok: false,
      code: "CONSULTATION_CLOSED",
      message: "La consultation libre-service est fermée.",
    };
  }
  if (String(input.pollStatus || "").toUpperCase() !== "ACTIVE") {
    return {
      ok: false,
      code: "POLL_NOT_OPEN",
      message: "Cette question n’est pas ouverte au vote.",
    };
  }
  if (!isSelfServiceCatalogType(input.pollType)) {
    return {
      ok: false,
      code: "POLL_TYPE_EXCLUDED",
      message: "Ce type de question n’est pas disponible en libre-service.",
    };
  }
  return { ok: true };
}

/**
 * Choisir les questions ouvertes (ACTIVE) en libre-service — multi autorisé.
 * @param {{
 *   mode?: unknown;
 *   isLocked?: unknown;
 *   liveState?: unknown;
 *   polls?: Array<{ id?: unknown; status?: unknown; type?: unknown; order?: unknown }> | null;
 *   requestedPollIds?: unknown;
 * }} input
 */
function evaluateSetSelfServiceOpenPolls(input = {}) {
  const mutable = assertConsultationModeMutable(input);
  if (!mutable.ok) return mutable;
  if (normalizeConsultationMode(input.mode) !== CONSULTATION_MODE.SELF_SERVICE) {
    return {
      ok: false,
      status: 409,
      error: "Sélection des questions ouvertes réservée au mode libre-service.",
    };
  }
  const requested = Array.isArray(input.requestedPollIds)
    ? [
        ...new Set(
          input.requestedPollIds
            .map((x) => String(x || "").trim())
            .filter(Boolean),
        ),
      ]
    : null;
  if (requested == null) {
    return {
      ok: false,
      status: 400,
      error: 'Corps attendu : { pollIds: string[] }.',
    };
  }

  const polls = Array.isArray(input.polls) ? input.polls : [];
  const byId = new Map();
  for (const p of polls) {
    const id = typeof p?.id === "string" ? p.id.trim() : "";
    if (!id) continue;
    byId.set(id, {
      id,
      status: String(p?.status || "").toUpperCase(),
      type: String(p?.type || "").toUpperCase(),
    });
  }

  /** @type {string[]} */
  const pollIdsToActivate = [];
  /** @type {string[]} */
  const rejected = [];
  for (const id of requested) {
    const p = byId.get(id);
    if (!p || p.status === "ARCHIVED") {
      rejected.push(id);
      continue;
    }
    if (!isSelfServiceCatalogType(p.type)) {
      rejected.push(id);
      continue;
    }
    pollIdsToActivate.push(id);
  }

  /** @type {string[]} */
  const pollIdsToDeactivate = [];
  for (const p of byId.values()) {
    if (p.status !== "ACTIVE") continue;
    if (!isSelfServiceCatalogType(p.type)) continue;
    if (!pollIdsToActivate.includes(p.id)) {
      pollIdsToDeactivate.push(p.id);
    }
  }

  return {
    ok: true,
    pollIdsToActivate,
    pollIdsToDeactivate,
    rejectedPollIds: rejected,
  };
}

/**
 * Entrées catalogue public (questions éligibles).
 * @param {{
 *   polls?: Array<{
 *     id?: unknown;
 *     status?: unknown;
 *     type?: unknown;
 *     order?: unknown;
 *     question?: unknown;
 *     title?: unknown;
 *     leadEnabled?: unknown;
 *   }> | null;
 *   selfServiceOpen?: unknown;
 * }} input
 */
/**
 * Statuts exposés au catalogue / URL publique Libre-service.
 * DRAFT = jamais publié → invisible participant.
 * ACTIVE = ouvert (si consultation ouverte).
 * CLOSED = publié puis désactivé → résultats, plus de vote.
 */
function isSelfServicePublicPollStatus(status) {
  const s = String(status || "").toUpperCase();
  return s === "ACTIVE" || s === "CLOSED";
}

function buildSelfServiceCatalog(input = {}) {
  const open = Boolean(input.selfServiceOpen);
  const polls = Array.isArray(input.polls) ? input.polls : [];
  return polls
    .map((p, i) => {
      const id = typeof p?.id === "string" ? p.id.trim() : "";
      const type = String(p?.type || "").toUpperCase();
      const status = String(p?.status || "").toUpperCase();
      if (
        !id ||
        !isSelfServiceCatalogType(type) ||
        !isSelfServicePublicPollStatus(status)
      ) {
        return null;
      }
      const label =
        (typeof p.question === "string" && p.question.trim()) ||
        (typeof p.title === "string" && p.title.trim()) ||
        `Question ${i + 1}`;
      const isOpen = open && status === "ACTIVE";
      return {
        id,
        label,
        type,
        status,
        order: Number.isFinite(Number(p.order)) ? Number(p.order) : i,
        leadEnabled: Boolean(p.leadEnabled),
        open: isOpen,
        votable: isOpen,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order);
}

module.exports = {
  CONSULTATION_MODE,
  SELF_SERVICE_EXCLUDED_TYPES,
  parseConsultationMode,
  normalizeConsultationMode,
  consultationModeApiFields,
  assertConsultationModeMutable,
  evaluateSetConsultationMode,
  evaluateOpenSelfServiceConsultation,
  evaluateCloseSelfServiceConsultation,
  buildNormalizeLivePollsPlan,
  normalizeSelfServiceSelectedPollIds,
  snapshotSelfServiceSelectedPollIds,
  buildRestoreSelfServicePollsPlan,
  isSelfServiceCatalogType,
  isSelfServicePublicPollStatus,
  canAcceptSelfServiceVote,
  evaluateSetSelfServiceOpenPolls,
  buildSelfServiceCatalog,
};
