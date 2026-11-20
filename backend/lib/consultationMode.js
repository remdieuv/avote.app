/**
 * Libre-service étape 1 — mode Event LIVE | SELF_SERVICE + ouverture réversible.
 * Pure : pas d’I/O. Aucune purge de votes / slug.
 */

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

module.exports = {
  CONSULTATION_MODE,
  parseConsultationMode,
  normalizeConsultationMode,
  consultationModeApiFields,
  assertConsultationModeMutable,
  evaluateSetConsultationMode,
  evaluateOpenSelfServiceConsultation,
  evaluateCloseSelfServiceConsultation,
  buildNormalizeLivePollsPlan,
};
