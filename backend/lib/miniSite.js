/**
 * Mini-site événementiel — Lot 1 (socle Accueil / Participer).
 * Pure + agrégats SQL. Réutilise publicPollVisibility (PR #96/#97).
 */

const {
  CONSULTATION_MODE,
  normalizeConsultationMode,
  consultationModeApiFields,
} = require("./consultationMode");
const {
  PUBLIC_POLL_SURFACE,
  filterPollsForPublicSurface,
  landingFeedResultPollsWhere,
} = require("./publicPollVisibility");

const MINI_SITE_TABS = Object.freeze([
  { id: "accueil", path: "", required: true },
  { id: "participer", path: "participer", required: true },
  { id: "resultats", path: "resultats", required: false, flag: "miniSiteTabResults" },
  { id: "journal", path: "journal", required: false, flag: "miniSiteTabJournal" },
  { id: "galerie", path: "galerie", required: false, flag: "miniSiteTabGallery" },
  { id: "a-propos", path: "a-propos", required: false, flag: "miniSiteTabAbout" },
]);

/**
 * Onglets facultatifs déjà développés (activables côté public si flag orga).
 * Lots 4–5 restent non disponibles.
 */
const MINI_SITE_AVAILABLE_OPTIONAL_FLAGS = Object.freeze(
  new Set(["miniSiteTabResults", "miniSiteTabJournal"]),
);

/**
 * Champs API stables pour le mini-site (lecture publique / admin).
 * @param {object | null | undefined} event
 * @param {{ allowOptionalTabs?: boolean }} [opts]
 *   allowOptionalTabs=true : admin — expose tous les flags (y compris non dispo).
 *   false/absent : public — seuls Accueil/Participer + onglets disponibles activés.
 */
function miniSiteApiFields(event, opts = {}) {
  const allowOptional = opts.allowOptionalTabs === true;
  const showKeyStats =
    event == null
      ? true
      : event.miniSiteShowKeyStats !== false;
  const flags = {
    results: Boolean(event?.miniSiteTabResults),
    journal: Boolean(event?.miniSiteTabJournal),
    gallery: Boolean(event?.miniSiteTabGallery),
    about: Boolean(event?.miniSiteTabAbout),
  };
  const tabs = MINI_SITE_TABS.map((t) => {
    if (t.required) {
      return {
        id: t.id,
        path: t.path,
        enabled: true,
        required: true,
        available: true,
      };
    }
    const flagOn = t.flag === "miniSiteTabResults"
      ? flags.results
      : t.flag === "miniSiteTabJournal"
        ? flags.journal
        : t.flag === "miniSiteTabGallery"
          ? flags.gallery
          : flags.about;
    const available = MINI_SITE_AVAILABLE_OPTIONAL_FLAGS.has(t.flag);
    const enabled = available && flagOn;
    return {
      id: t.id,
      path: t.path,
      enabled: allowOptional ? flagOn : enabled,
      required: false,
      available,
    };
  });
  // Navigation publique : uniquement les onglets réellement accessibles.
  const publicTabs = allowOptional
    ? tabs
    : tabs.filter((t) => t.enabled === true);
  return {
    miniSiteShowKeyStats: showKeyStats,
    miniSiteTabResults: flags.results,
    miniSiteTabJournal: flags.journal,
    miniSiteTabGallery: flags.gallery,
    miniSiteTabAbout: flags.about,
    tabs: publicTabs,
  };
}

/**
 * Statut public Accueil / Participer (libellés adaptés Live vs Libre-service).
 * @param {{
 *   consultationMode?: unknown;
 *   selfServiceOpen?: unknown;
 *   liveState?: unknown;
 *   voteState?: unknown;
 *   displayState?: unknown;
 *   isLocked?: unknown;
 *   participantsUsed?: unknown;
 *   participantsLimit?: unknown;
 *   limitReached?: unknown;
 * }} event
 */
function resolveMiniSitePublicStatus(event = {}) {
  const modeFields = consultationModeApiFields(event);
  const mode = normalizeConsultationMode(event.consultationMode);
  const ls = String(event.liveState || "").toLowerCase();
  const vs = String(event.voteState || "").toLowerCase();
  const locked = Boolean(event.isLocked) || ls === "finished";
  const used = Math.max(0, Number(event.participantsUsed) || 0);
  const limit = Math.max(0, Number(event.participantsLimit) || 0);
  const capacityFull =
    event.limitReached === true || (limit > 0 && used >= limit);

  if (locked) {
    return {
      ...modeFields,
      phase: "finished",
      statusKey: "finished",
      statusLabel: "Événement terminé",
      ctaLabel: "Voir l’événement",
      ctaHrefKind: "home",
      capacityFull: false,
      participationOpen: false,
    };
  }

  if (capacityFull) {
    return {
      ...modeFields,
      phase: "capacity_full",
      statusKey: "capacity_full",
      statusLabel: "Capacité maximale atteinte",
      statusHint:
        "La limite de participants est atteinte pour le moment. Ce n’est pas une clôture définitive de l’événement.",
      ctaLabel:
        mode === CONSULTATION_MODE.SELF_SERVICE
          ? "Accéder à la consultation"
          : "Accéder à la salle",
      ctaHrefKind: "join",
      capacityFull: true,
      participationOpen: false,
    };
  }

  if (mode === CONSULTATION_MODE.SELF_SERVICE) {
    const open = Boolean(event.selfServiceOpen);
    if (open) {
      return {
        ...modeFields,
        phase: "ss_open",
        statusKey: "ss_open",
        statusLabel: "Consultation ouverte",
        ctaLabel: "Participer",
        ctaHrefKind: "join",
        capacityFull: false,
        participationOpen: true,
      };
    }
    return {
      ...modeFields,
      phase: "ss_paused",
      statusKey: "ss_paused",
      statusLabel: "Consultation en pause",
      statusHint: "Les questions visibles restent accessibles en lecture.",
      ctaLabel: "Voir la consultation",
      ctaHrefKind: "join",
      capacityFull: false,
      participationOpen: false,
    };
  }

  // LIVE
  if (
    ls === "voting" ||
    vs === "open" ||
    String(event.displayState || "").toLowerCase() === "question"
  ) {
    return {
      ...modeFields,
      phase: "live_active",
      statusKey: "live_active",
      statusLabel: "Participation en cours",
      ctaLabel: "Participer",
      ctaHrefKind: "join",
      capacityFull: false,
      participationOpen: true,
    };
  }
  if (ls === "results" || String(event.displayState || "").toLowerCase() === "results") {
    return {
      ...modeFields,
      phase: "live_results",
      statusKey: "live_results",
      statusLabel: "Résultats en cours",
      ctaLabel: "Rejoindre la salle",
      ctaHrefKind: "join",
      capacityFull: false,
      participationOpen: false,
    };
  }
  if (ls === "paused") {
    return {
      ...modeFields,
      phase: "live_paused",
      statusKey: "live_paused",
      statusLabel: "En pause",
      ctaLabel: "Rejoindre la salle",
      ctaHrefKind: "join",
      capacityFull: false,
      participationOpen: false,
    };
  }
  return {
    ...modeFields,
    phase: "live_waiting",
    statusKey: "live_waiting",
    statusLabel: "En attente",
    ctaLabel: "Rejoindre la salle",
    ctaHrefKind: "join",
    capacityFull: false,
    participationOpen: false,
  };
}

/**
 * Chiffres clés publics — uniquement polls exposables (Lot 0).
 * @param {{ poll: { findMany: Function }; $queryRaw: Function }} db
 * @param {object} event — Event avec id + champs consultation / sélection
 * @returns {Promise<{
 *   participantsUnique: number;
 *   questionsPublic: number;
 *   answersPublic: number;
 * } | null>}
 */
async function fetchMiniSitePublicStats(db, event) {
  if (!event?.id) {
    return { participantsUnique: 0, questionsPublic: 0, answersPublic: 0 };
  }
  if (event.miniSiteShowKeyStats === false) {
    return null;
  }

  const candidates = await db.poll.findMany({
    where: landingFeedResultPollsWhere(event),
    select: {
      id: true,
      status: true,
      type: true,
      leadEnabled: true,
      landingResultHidden: true,
    },
  });
  const visible = filterPollsForPublicSurface({
    event,
    polls: candidates,
    surface: PUBLIC_POLL_SURFACE.LANDING_FEED_RESULT,
  });
  const ids = visible
    .map((p) => (typeof p.id === "string" ? p.id.trim() : ""))
    .filter(Boolean);

  if (ids.length === 0) {
    return { participantsUnique: 0, questionsPublic: 0, answersPublic: 0 };
  }

  const { Prisma } = require("@prisma/client");
  const rows = await db.$queryRaw`
    SELECT
      COUNT(DISTINCT v."voterSessionId")::int AS "participantsUnique",
      COUNT(*)::int AS "answersPublic"
    FROM "Vote" v
    WHERE v."pollId" IN (${Prisma.join(ids)})
  `;
  const participantsUnique = Number(rows?.[0]?.participantsUnique) || 0;
  const answersPublic = Number(rows?.[0]?.answersPublic) || 0;
  return {
    participantsUnique,
    questionsPublic: ids.length,
    answersPublic,
  };
}

/**
 * Dernière actualité publique (message orga non masqué).
 * @param {Array<{ id?: unknown; body?: unknown; hidden?: unknown; createdAt?: unknown }> | null | undefined} messages
 */
function pickLatestPublicNews(messages) {
  const list = Array.isArray(messages) ? messages : [];
  for (const m of list) {
    if (m?.hidden === true) continue;
    const body = typeof m.body === "string" ? m.body.trim() : "";
    if (!body) continue;
    const id = typeof m.id === "string" ? m.id : String(m.id || "");
    if (!id) continue;
    const title =
      typeof m.title === "string" && m.title.trim() ? m.title.trim() : null;
    return {
      id,
      title,
      body: body.slice(0, 500),
      createdAt:
        m.createdAt instanceof Date
          ? m.createdAt.toISOString()
          : m.createdAt
            ? new Date(m.createdAt).toISOString()
            : null,
    };
  }
  return null;
}

module.exports = {
  MINI_SITE_TABS,
  MINI_SITE_AVAILABLE_OPTIONAL_FLAGS,
  miniSiteApiFields,
  resolveMiniSitePublicStatus,
  fetchMiniSitePublicStats,
  pickLatestPublicNews,
};
