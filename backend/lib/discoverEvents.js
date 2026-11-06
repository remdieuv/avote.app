/**
 * Lot B — éligibilité Discover, catégories automatiques, parsing filtres.
 * La date ne lance jamais le direct : « lancé » = isLiveConsumed (mode réel).
 */

const { EVENT_VISIBILITY, isEventPublic } = require("./eventVisibility");
const {
  normalizeDiscoverCity,
  parseDiscoverStartsAt,
  normalizeThemeRef,
} = require("./discoverCatalog");

const DISCOVER_CATEGORIES = Object.freeze({
  UPCOMING: "upcoming",
  LIVE: "live",
  FINISHED: "finished",
  /** Date passée, jamais lancé en réel — hors onglets À venir / En direct / Terminés. */
  OVERDUE: "overdue",
});

const DISCOVER_LIMIT_DEFAULT = 20;
const DISCOVER_LIMIT_MAX = 50;

/**
 * Éligible à l’annuaire : PUBLIC + thème principal + startsAt.
 * Profil orga (Lot D) non requis ici.
 * @param {{
 *   visibility?: unknown;
 *   primaryThemeId?: unknown;
 *   startsAt?: unknown;
 * }} event
 */
function isDiscoverEligible(event) {
  if (!isEventPublic(event?.visibility)) return false;
  const themeId =
    typeof event?.primaryThemeId === "string" ? event.primaryThemeId.trim() : "";
  if (!themeId) return false;
  if (event?.startsAt == null) return false;
  if (event.startsAt instanceof Date && Number.isNaN(event.startsAt.getTime())) {
    return false;
  }
  return true;
}

/**
 * @param {{ liveState?: unknown; isLiveConsumed?: unknown }} event
 */
function isEventFinished(event) {
  return String(event?.liveState || "")
    .trim()
    .toUpperCase() === "FINISHED";
}

/**
 * Lancé en réel (pas le mode TEST seul).
 * @param {{ isLiveConsumed?: unknown }} event
 */
function isEventReallyLaunched(event) {
  return Boolean(event?.isLiveConsumed);
}

/**
 * Catégorie Discover pour un événement déjà éligible.
 * @param {{
 *   liveState?: unknown;
 *   isLiveConsumed?: unknown;
 *   startsAt?: Date | string | null;
 * }} event
 * @param {Date} [now]
 * @returns {"upcoming"|"live"|"finished"|"overdue"|null}
 */
function resolveDiscoverCategory(event, now = new Date()) {
  if (isEventFinished(event)) return DISCOVER_CATEGORIES.FINISHED;
  if (isEventReallyLaunched(event)) return DISCOVER_CATEGORIES.LIVE;

  const startsAt =
    event?.startsAt instanceof Date
      ? event.startsAt
      : event?.startsAt
        ? new Date(event.startsAt)
        : null;
  if (!startsAt || Number.isNaN(startsAt.getTime())) return null;

  if (startsAt.getTime() > now.getTime()) return DISCOVER_CATEGORIES.UPCOMING;
  return DISCOVER_CATEGORIES.OVERDUE;
}

/**
 * @param {unknown} raw
 * @returns {"upcoming"|"live"|"finished"|"overdue"|null|undefined}
 *   undefined = absent ; null = invalide
 */
function parseDiscoverCategory(raw) {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  if (
    v === DISCOVER_CATEGORIES.UPCOMING ||
    v === DISCOVER_CATEGORIES.LIVE ||
    v === DISCOVER_CATEGORIES.FINISHED ||
    v === DISCOVER_CATEGORIES.OVERDUE
  ) {
    return v;
  }
  // Alias FR → EN
  if (v === "a-venir" || v === "à-venir" || v === "avenir") {
    return DISCOVER_CATEGORIES.UPCOMING;
  }
  if (v === "en-direct" || v === "direct") return DISCOVER_CATEGORIES.LIVE;
  if (v === "termines" || v === "terminés" || v === "termine") {
    return DISCOVER_CATEGORIES.FINISHED;
  }
  return null;
}

/**
 * @param {unknown} raw
 * @returns {number}
 */
function parseDiscoverLimit(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DISCOVER_LIMIT_DEFAULT;
  return Math.min(DISCOVER_LIMIT_MAX, Math.floor(n));
}

/**
 * @param {unknown} raw
 * @returns {number}
 */
function parseDiscoverOffset(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

/**
 * Construit le filtre Prisma + post-filtre catégorie pour Discover.
 * Les privés ne sont jamais inclus (visibility PUBLIC obligatoire).
 *
 * @param {{
 *   category?: unknown;
 *   q?: unknown;
 *   city?: unknown;
 *   theme?: unknown;
 *   now?: Date;
 * }} query
 * @returns {{
 *   ok: true;
 *   category: "upcoming"|"live"|"finished"|"overdue"|null;
 *   prismaWhere: Record<string, unknown>;
 *   excludeOverdueUnlessRequested: boolean;
 *   q: string;
 *   city: string | null;
 *   themeRef: string | null;
 *   now: Date;
 * } | {
 *   ok: false;
 *   status: number;
 *   error: string;
 *   code?: string;
 * }}
 */
function buildDiscoverEventsQuery(query) {
  const now = query?.now instanceof Date ? query.now : new Date();
  const categoryParsed = parseDiscoverCategory(query?.category);
  if (categoryParsed === null) {
    return {
      ok: false,
      status: 400,
      error:
        'category invalide (upcoming|live|finished|overdue, ou alias FR).',
      code: "INVALID_CATEGORY",
    };
  }

  const cityNorm = normalizeDiscoverCity(
    typeof query?.city === "string" ? query.city : query?.city === null ? null : query?.city,
  );
  if (cityNorm === undefined && query?.city != null && query.city !== "") {
    return {
      ok: false,
      status: 400,
      error: "city invalide.",
      code: "INVALID_CITY",
    };
  }

  const themeRef = normalizeThemeRef(query?.theme);
  if (themeRef === undefined && query?.theme != null && query.theme !== "") {
    return {
      ok: false,
      status: 400,
      error: "theme invalide.",
      code: "INVALID_THEME",
    };
  }

  const q =
    typeof query?.q === "string" ? query.q.trim().slice(0, 120) : "";

  /** @type {Record<string, unknown>} */
  const prismaWhere = {
    visibility: EVENT_VISIBILITY.PUBLIC,
    primaryThemeId: { not: null },
    startsAt: { not: null },
  };

  if (cityNorm) {
    prismaWhere.city = { equals: cityNorm, mode: "insensitive" };
  }

  if (themeRef) {
    prismaWhere.OR = [
      { primaryThemeId: themeRef },
      { primaryTheme: { slug: themeRef } },
      { secondaryThemeId: themeRef },
      { secondaryTheme: { slug: themeRef } },
    ];
  }

  if (q) {
    const textOr = [
      { title: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { primaryTheme: { label: { contains: q, mode: "insensitive" } } },
      { secondaryTheme: { label: { contains: q, mode: "insensitive" } } },
      // Organisateur : Lot D (profils) — pas d’e-mail public.
    ];
    if (prismaWhere.OR) {
      prismaWhere.AND = [{ OR: prismaWhere.OR }, { OR: textOr }];
      delete prismaWhere.OR;
    } else {
      prismaWhere.OR = textOr;
    }
  }

  // Catégories basées sur liveState / isLiveConsumed / startsAt.
  // La date ne déclenche jamais le direct (isLiveConsumed requis pour « live »).
  if (categoryParsed === DISCOVER_CATEGORIES.FINISHED) {
    prismaWhere.liveState = "FINISHED";
  } else if (categoryParsed === DISCOVER_CATEGORIES.LIVE) {
    prismaWhere.isLiveConsumed = true;
    prismaWhere.liveState = { not: "FINISHED" };
  } else if (categoryParsed === DISCOVER_CATEGORIES.UPCOMING) {
    prismaWhere.isLiveConsumed = false;
    prismaWhere.liveState = { not: "FINISHED" };
    prismaWhere.startsAt = { gt: now };
  } else if (categoryParsed === DISCOVER_CATEGORIES.OVERDUE) {
    prismaWhere.isLiveConsumed = false;
    prismaWhere.liveState = { not: "FINISHED" };
    prismaWhere.startsAt = { lte: now };
  } else {
    // Listing général : exclure les « overdue » (date passée, jamais lancés).
    const notOverdue = {
      OR: [
        { liveState: "FINISHED" },
        { isLiveConsumed: true },
        { startsAt: { gt: now } },
      ],
    };
    if (prismaWhere.AND) {
      prismaWhere.AND = [
        ...(Array.isArray(prismaWhere.AND)
          ? prismaWhere.AND
          : [prismaWhere.AND]),
        notOverdue,
      ];
    } else {
      prismaWhere.AND = [notOverdue];
    }
  }

  return {
    ok: true,
    category: categoryParsed ?? null,
    prismaWhere,
    excludeOverdueUnlessRequested: categoryParsed == null,
    q,
    city: cityNorm ?? null,
    themeRef: themeRef ?? null,
    now,
  };
}

/**
 * Filtre post-requête : exclut overdue du listing général ; vérifie la catégorie.
 * @param {Array<Record<string, unknown>>} rows
 * @param {{
 *   category: "upcoming"|"live"|"finished"|"overdue"|null;
 *   excludeOverdueUnlessRequested: boolean;
 *   now: Date;
 * }} opts
 */
function filterDiscoverRowsByCategory(rows, opts) {
  const out = [];
  for (const row of rows || []) {
    const cat = resolveDiscoverCategory(row, opts.now);
    if (!cat) continue;
    if (
      opts.excludeOverdueUnlessRequested &&
      cat === DISCOVER_CATEGORIES.OVERDUE
    ) {
      continue;
    }
    if (opts.category && cat !== opts.category) continue;
    out.push({ ...row, discoverCategory: cat });
  }
  return out;
}

/**
 * Valide primary / secondary theme (max 2, distincts).
 * @param {{
 *   primaryThemeId?: unknown;
 *   secondaryThemeId?: unknown;
 *   primaryExists?: boolean;
 *   secondaryExists?: boolean;
 * }} args
 */
function validateEventThemes(args) {
  const primary = normalizeThemeRef(args?.primaryThemeId);
  const secondary = normalizeThemeRef(args?.secondaryThemeId);
  if (primary === undefined) {
    return {
      ok: false,
      status: 400,
      error: "primaryThemeId invalide.",
      code: "INVALID_PRIMARY_THEME",
    };
  }
  if (secondary === undefined) {
    return {
      ok: false,
      status: 400,
      error: "secondaryThemeId invalide.",
      code: "INVALID_SECONDARY_THEME",
    };
  }
  if (primary && args?.primaryExists === false) {
    return {
      ok: false,
      status: 400,
      error: "Thème principal introuvable.",
      code: "PRIMARY_THEME_NOT_FOUND",
    };
  }
  if (secondary && args?.secondaryExists === false) {
    return {
      ok: false,
      status: 400,
      error: "Thème secondaire introuvable.",
      code: "SECONDARY_THEME_NOT_FOUND",
    };
  }
  if (primary && secondary && primary === secondary) {
    return {
      ok: false,
      status: 400,
      error: "Le thème secondaire doit être distinct du thème principal.",
      code: "THEMES_NOT_DISTINCT",
    };
  }
  return { ok: true, primaryThemeId: primary, secondaryThemeId: secondary };
}

/**
 * Payload public d’une carte Discover.
 * @param {Record<string, any>} event
 */
function mapDiscoverEventCard(event) {
  const cat =
    event.discoverCategory ||
    resolveDiscoverCategory(event) ||
    null;
  const primary = event.primaryTheme
    ? {
        id: event.primaryTheme.id,
        slug: event.primaryTheme.slug,
        label: event.primaryTheme.label,
      }
    : null;
  const secondary = event.secondaryTheme
    ? {
        id: event.secondaryTheme.id,
        slug: event.secondaryTheme.slug,
        label: event.secondaryTheme.label,
      }
    : null;
  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    city: event.city ?? null,
    startsAt:
      event.startsAt instanceof Date
        ? event.startsAt.toISOString()
        : event.startsAt
          ? new Date(event.startsAt).toISOString()
          : null,
    visibility: "public",
    isPublic: true,
    discoverCategory: cat,
    liveState: String(event.liveState || "").toLowerCase(),
    isLiveConsumed: Boolean(event.isLiveConsumed),
    landingEnabled: Boolean(event.landingEnabled),
    landingCoverUrl: event.landingCoverUrl ?? null,
    primaryTheme: primary,
    secondaryTheme: secondary,
    joinPath: `/join/${event.slug}`,
    landingPath: event.landingEnabled ? `/e/${event.slug}` : null,
  };
}

module.exports = {
  DISCOVER_CATEGORIES,
  DISCOVER_LIMIT_DEFAULT,
  DISCOVER_LIMIT_MAX,
  isDiscoverEligible,
  isEventFinished,
  isEventReallyLaunched,
  resolveDiscoverCategory,
  parseDiscoverCategory,
  parseDiscoverLimit,
  parseDiscoverOffset,
  buildDiscoverEventsQuery,
  filterDiscoverRowsByCategory,
  validateEventThemes,
  mapDiscoverEventCard,
};
