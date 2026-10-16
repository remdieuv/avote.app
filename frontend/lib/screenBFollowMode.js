/**
 * Écran B — sync avec A (défaut) ou affichage indépendant.
 * Persistance localStorage par slug + param URL + signal socket.
 */

export const SCREEN_B_INDEPENDENT_STORAGE_PREFIX = "avote_screen_b_independent_";
export const SCREEN_B_DISPLAY_STORAGE_PREFIX = "avote_screen_b_display_";

/** @type {ReadonlySet<string>} */
export const SCREEN_DISPLAY_STATES = new Set([
  "question",
  "results",
  "waiting",
  "black",
]);

/**
 * @param {unknown} raw
 * @returns {"question" | "results" | "waiting" | "black" | null}
 */
export function normalizeScreenDisplayState(raw) {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (SCREEN_DISPLAY_STATES.has(v)) {
    return /** @type {"question" | "results" | "waiting" | "black"} */ (v);
  }
  return null;
}

/**
 * @param {string | null | undefined} slug
 */
export function screenBIndependentStorageKey(slug) {
  const s = String(slug || "").trim();
  return s ? `${SCREEN_B_INDEPENDENT_STORAGE_PREFIX}${s}` : null;
}

/**
 * @param {unknown} raw
 * @returns {boolean | null} null = non précisé
 */
export function parseScreenBIndependentFlag(raw) {
  if (raw === true || raw === 1) return true;
  if (raw === false || raw === 0) return false;
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!v) return null;
  if (v === "1" || v === "true" || v === "yes" || v === "independent" || v === "indep") {
    return true;
  }
  if (v === "0" || v === "false" || v === "no" || v === "sync" || v === "follow") {
    return false;
  }
  return null;
}

/**
 * Lit le mode indépendant mémorisé (défaut : sync → false).
 * @param {string | null | undefined} slug
 * @param {{ storage?: Storage | null }} [opts]
 */
export function readScreenBIndependent(slug, opts = {}) {
  const key = screenBIndependentStorageKey(slug);
  if (!key) return false;
  const storage =
    opts.storage !== undefined
      ? opts.storage
      : typeof window !== "undefined"
        ? window.localStorage
        : null;
  if (!storage) return false;
  try {
    const parsed = parseScreenBIndependentFlag(storage.getItem(key));
    return parsed === true;
  } catch {
    return false;
  }
}

/**
 * @param {string | null | undefined} slug
 * @param {boolean} independent
 * @param {{ storage?: Storage | null }} [opts]
 */
export function writeScreenBIndependent(slug, independent, opts = {}) {
  const key = screenBIndependentStorageKey(slug);
  if (!key) return false;
  const storage =
    opts.storage !== undefined
      ? opts.storage
      : typeof window !== "undefined"
        ? window.localStorage
        : null;
  if (!storage) return false;
  try {
    storage.setItem(key, independent ? "1" : "0");
    return true;
  } catch {
    return false;
  }
}

/**
 * Résout le mode à partir de l’URL (prioritaire) puis du storage.
 * @param {{
 *   slug?: string | null;
 *   searchParam?: unknown;
 *   storage?: Storage | null;
 *   socketIndependent?: boolean | null;
 * }} [input]
 * @returns {{ independent: boolean; source: "url" | "socket" | "storage" | "default" }}
 */
export function resolveScreenBIndependentMode(input = {}) {
  const fromUrl = parseScreenBIndependentFlag(input.searchParam);
  if (fromUrl !== null) {
    return { independent: fromUrl, source: "url" };
  }
  if (typeof input.socketIndependent === "boolean") {
    return {
      independent: input.socketIndependent,
      source: "socket",
    };
  }
  const fromStorage = readScreenBIndependent(input.slug, {
    storage: input.storage,
  });
  if (fromStorage) {
    return { independent: true, source: "storage" };
  }
  return { independent: false, source: "default" };
}

/**
 * @param {string | null | undefined} slug
 */
export function screenBDisplayStorageKey(slug) {
  const s = String(slug || "").trim();
  return s ? `${SCREEN_B_DISPLAY_STORAGE_PREFIX}${s}` : null;
}

/**
 * Display indépendant B mémorisé (survit au F5 côté client).
 * @param {string | null | undefined} slug
 * @param {{ storage?: Storage | null }} [opts]
 * @returns {"question" | "results" | "waiting" | "black" | null}
 */
export function readScreenBDisplayState(slug, opts = {}) {
  const key = screenBDisplayStorageKey(slug);
  if (!key) return null;
  const storage =
    opts.storage !== undefined
      ? opts.storage
      : typeof window !== "undefined"
        ? window.localStorage
        : null;
  if (!storage) return null;
  try {
    return normalizeScreenDisplayState(storage.getItem(key));
  } catch {
    return null;
  }
}

/**
 * @param {string | null | undefined} slug
 * @param {unknown} displayState
 * @param {{ storage?: Storage | null }} [opts]
 */
export function writeScreenBDisplayState(slug, displayState, opts = {}) {
  const key = screenBDisplayStorageKey(slug);
  const normalized = normalizeScreenDisplayState(displayState);
  if (!key || !normalized) return false;
  const storage =
    opts.storage !== undefined
      ? opts.storage
      : typeof window !== "undefined"
        ? window.localStorage
        : null;
  if (!storage) return false;
  try {
    storage.setItem(key, normalized);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string | null | undefined} slug
 * @param {{ storage?: Storage | null }} [opts]
 */
export function clearScreenBDisplayState(slug, opts = {}) {
  const key = screenBDisplayStorageKey(slug);
  if (!key) return false;
  const storage =
    opts.storage !== undefined
      ? opts.storage
      : typeof window !== "undefined"
        ? window.localStorage
        : null;
  if (!storage) return false;
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/**
 * Display effectif au chargement / après meta : B indépendant garde sa cible.
 * Indépendant sans cible → conserve `currentDisplay` (jamais le main A).
 * @param {{
 *   screenId?: string | null;
 *   independent?: boolean;
 *   mainDisplay?: unknown;
 *   targetedDisplay?: unknown;
 *   currentDisplay?: unknown;
 * }} [input]
 * @returns {"question" | "results" | "waiting" | "black" | null}
 */
export function resolveScreenClientDisplayState(input = {}) {
  const follows = screenFollowsMainDisplay({
    screenId: input.screenId,
    independent: input.independent,
  });
  const targeted = normalizeScreenDisplayState(input.targetedDisplay);
  if (!follows) {
    if (targeted) return targeted;
    return normalizeScreenDisplayState(input.currentDisplay);
  }
  return normalizeScreenDisplayState(input.mainDisplay);
}

/**
 * Applique un `screen:update` côté client Screen (état pur — tests de course).
 * Une commande ciblée sid=b verrouille le display indépendant ; les updates
 * globales ne l’écrasent jamais tant que independent reste true.
 * @param {{
 *   localScreenId?: string | null;
 *   independent?: boolean;
 *   displayState?: unknown;
 *   targetedDisplay?: unknown;
 *   payloadScreenId?: unknown;
 *   payloadDisplayState?: unknown;
 * }} [input]
 * @returns {{
 *   independent: boolean;
 *   displayState: string | null;
 *   targetedDisplay: string | null;
 *   accepted: boolean;
 * }}
 */
export function applyScreenUpdateToClientState(input = {}) {
  const local = String(input.localScreenId || "")
    .trim()
    .toLowerCase() || null;
  const payloadSid =
    typeof input.payloadScreenId === "string" && input.payloadScreenId.trim()
      ? input.payloadScreenId.trim().toLowerCase()
      : null;
  let independent = input.independent === true;
  let displayState = normalizeScreenDisplayState(input.displayState);
  let targetedDisplay = normalizeScreenDisplayState(input.targetedDisplay);
  const incoming = normalizeScreenDisplayState(input.payloadDisplayState);

  const matches = screenPayloadMatchesClient({
    localScreenId: local,
    payloadScreenId: payloadSid,
    independent,
  });
  if (!matches || !incoming) {
    return {
      independent,
      displayState,
      targetedDisplay,
      accepted: false,
    };
  }

  // Commande explicite B : verrouille + active le mode indépendant si besoin.
  if (local === "b" && payloadSid === "b") {
    independent = true;
    targetedDisplay = incoming;
    displayState = incoming;
    return {
      independent,
      displayState,
      targetedDisplay,
      accepted: true,
    };
  }

  displayState = incoming;
  if (!payloadSid || screenFollowsMainDisplay({ screenId: local, independent })) {
    targetedDisplay = null;
  }
  return {
    independent,
    displayState,
    targetedDisplay,
    accepted: true,
  };
}

/**
 * Après une update globale (live/meta/poll) : B indépendant ignore le main.
 * @param {{
 *   screenId?: string | null;
 *   independent?: boolean;
 *   displayState?: unknown;
 *   targetedDisplay?: unknown;
 *   mainDisplay?: unknown;
 * }} [input]
 * @returns {"question" | "results" | "waiting" | "black" | null}
 */
export function applyMainDisplayToClientState(input = {}) {
  return resolveScreenClientDisplayState({
    screenId: input.screenId,
    independent: input.independent,
    mainDisplay: input.mainDisplay,
    targetedDisplay: input.targetedDisplay,
    currentDisplay: input.displayState,
  });
}

/**
 * Basculer sync ↔ indépendant côté client B (état pur).
 * Retour sync : drop la cible et applique immédiatement syncDisplayState / main A.
 * @param {{
 *   independent?: boolean;
 *   displayState?: unknown;
 *   targetedDisplay?: unknown;
 *   syncDisplayState?: unknown;
 *   mainDisplay?: unknown;
 * }} [input]
 * @returns {{
 *   independent: boolean;
 *   displayState: string | null;
 *   targetedDisplay: string | null;
 *   indepQueryValue: "0" | "1";
 * }}
 */
export function applyScreenBModeToClientState(input = {}) {
  const independent = input.independent === true;
  let displayState = normalizeScreenDisplayState(input.displayState);
  let targetedDisplay = normalizeScreenDisplayState(input.targetedDisplay);

  if (independent) {
    return {
      independent: true,
      displayState,
      targetedDisplay,
      indepQueryValue: "1",
    };
  }

  targetedDisplay = null;
  const syncDs = normalizeScreenDisplayState(input.syncDisplayState);
  const mainDs = normalizeScreenDisplayState(input.mainDisplay);
  if (syncDs) {
    displayState = syncDs;
  } else if (mainDs) {
    displayState = mainDs;
  }
  return {
    independent: false,
    displayState,
    targetedDisplay,
    indepQueryValue: "0",
  };
}

/**
 * Met à jour `indep` dans l’URL (F5 doit respecter le dernier mode socket/régie).
 * @param {string | null | undefined} href
 * @param {boolean} independent
 * @returns {string | null} nouvel href ou null si inchangé / invalide
 */
export function withScreenBIndepQuery(href, independent) {
  try {
    const raw = String(href || "").trim();
    if (!raw) return null;
    const url = new URL(raw, "http://local.invalid");
    const next = independent ? "1" : "0";
    if (url.searchParams.get("indep") === next) return null;
    url.searchParams.set("indep", next);
    url.searchParams.delete("independent");
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      return url.toString();
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/**
 * Un écran ciblé (B) suit-il le display principal ?
 * @param {{
 *   screenId?: string | null;
 *   independent?: boolean;
 * }} [input]
 */
export function screenFollowsMainDisplay(input = {}) {
  const sid = String(input.screenId || "")
    .trim()
    .toLowerCase();
  if (!sid) return true;
  // Seul B a un mode indépendant V1 ; les autres sid restent ciblés (legacy).
  if (sid !== "b") return false;
  return input.independent !== true;
}

/**
 * Filtre `screen:update` / auto_rotate pour un client Screen.
 * @param {{
 *   localScreenId?: string | null;
 *   payloadScreenId?: string | null;
 *   independent?: boolean;
 * }} [input]
 */
export function screenPayloadMatchesClient(input = {}) {
  const local = String(input.localScreenId || "")
    .trim()
    .toLowerCase() || null;
  const payload =
    typeof input.payloadScreenId === "string" && input.payloadScreenId.trim()
      ? input.payloadScreenId.trim().toLowerCase()
      : null;

  // Écran principal (A) : uniquement messages globaux (sans screenId).
  if (!local) {
    return !payload;
  }

  const follows = screenFollowsMainDisplay({
    screenId: local,
    independent: input.independent,
  });

  if (follows) {
    // Sync : accepter global (null) et ciblé sur ce sid.
    if (!payload) return true;
    return payload === local;
  }

  // Indépendant : ignorer le global, n’accepter que le ciblage.
  if (!payload) return false;
  return payload === local;
}

/**
 * Construit le chemin Screen B selon le mode.
 * @param {string} slug
 * @param {{ independent?: boolean; projectionMode?: string | null }} [opts]
 */
export function buildScreenBPath(slug, opts = {}) {
  const enc = encodeURIComponent(String(slug || "").trim());
  const params = new URLSearchParams();
  const pm = String(opts.projectionMode || "").trim();
  if (pm) params.set("pm", pm);
  params.set("sid", "b");
  if (opts.independent === true) {
    params.set("indep", "1");
  } else {
    params.set("indep", "0");
  }
  const q = params.toString();
  return `/screen/${enc}?${q}`;
}

/**
 * Badge « Écart global / écran B » seulement si sync attendue mais états différents.
 * @param {{
 *   screenBConnected?: boolean;
 *   screenBIndependent?: boolean;
 *   mainDisplayState?: string | null;
 *   screenBDisplayState?: string | null;
 * }} [input]
 */
export function shouldShowScreenBDisplayGap(input = {}) {
  if (!input.screenBConnected) return false;
  // Sync volontaire : pas d’alerte « écart » (B suit A).
  // Indépendant volontaire : pas d’alerte non plus.
  // Conservé pour d’éventuels diagnostics futurs si l’on tracke un vrai drift.
  if (input.screenBIndependent === true) return false;
  return false;
}
