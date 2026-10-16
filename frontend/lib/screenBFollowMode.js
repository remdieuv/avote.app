/**
 * Écran B — sync avec A (défaut) ou affichage indépendant.
 * Persistance localStorage par slug + param URL + signal socket.
 */

export const SCREEN_B_INDEPENDENT_STORAGE_PREFIX = "avote_screen_b_independent_";

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
