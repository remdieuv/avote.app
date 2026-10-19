/**
 * Allowlist CORS pour Express REST et Socket.IO.
 * Ne modifie pas CLIENT_URL : il reste l’origine front prod (Stripe + www).
 *
 * Autorisé :
 * - http://localhost:3000 / http://127.0.0.1:3000
 * - process.env.CLIENT_URL (ex. https://www.avote.app)
 * - https://avote-app.vercel.app
 * - https://avote-<id>-remdieuvs-projects.vercel.app
 */

/** Hosts Preview Vercel du projet AVOTE uniquement (pas tout *.vercel.app). */
const AVOTE_VERCEL_APP_HOST = "avote-app.vercel.app";
const AVOTE_VERCEL_PREVIEW_HOST_RE =
  /^avote-[a-z0-9]+-remdieuvs-projects\.vercel\.app$/i;

/**
 * @param {unknown} origin
 * @param {{ clientUrl?: string | null }} [opts]
 * @returns {boolean}
 */
function isAllowedCorsOrigin(origin, opts = {}) {
  if (typeof origin !== "string") return false;
  const raw = origin.trim();
  if (!raw) return false;

  let url;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }

  // Origin header = scheme + host[+port], sans path/query.
  if (raw !== url.origin) return false;

  /** @type {Set<string>} */
  const exact = new Set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);

  const clientUrlRaw =
    opts.clientUrl !== undefined
      ? opts.clientUrl
      : process.env.CLIENT_URL;
  const clientUrl = String(clientUrlRaw || "")
    .trim()
    .replace(/\/$/, "");
  if (clientUrl) {
    try {
      const cu = new URL(clientUrl);
      if (clientUrl === cu.origin) exact.add(clientUrl);
    } catch {
      /* CLIENT_URL invalide : ignoré pour CORS (Stripe gère son propre check) */
    }
  }

  if (exact.has(raw)) return true;

  // Previews Vercel AVOTE : HTTPS uniquement.
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (host === AVOTE_VERCEL_APP_HOST) return true;
  if (AVOTE_VERCEL_PREVIEW_HOST_RE.test(host)) return true;

  return false;
}

/**
 * Callback compatible package `cors` / Socket.IO.
 * Requêtes sans header Origin (curl, same-server) → autorisées sans ACAO.
 *
 * @param {string | undefined} origin
 * @param {(err: Error | null, allow?: boolean) => void} callback
 * @param {{ clientUrl?: string | null }} [opts]
 */
function corsOriginCallback(origin, callback, opts = {}) {
  if (!origin) {
    callback(null, true);
    return;
  }
  callback(null, isAllowedCorsOrigin(origin, opts));
}

module.exports = {
  AVOTE_VERCEL_APP_HOST,
  AVOTE_VERCEL_PREVIEW_HOST_RE,
  isAllowedCorsOrigin,
  corsOriginCallback,
};
