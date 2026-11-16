/**
 * Garde-fous : interdiction explicite des cibles de production AVOTE.
 */

/** Hostnames / suffixes de production — jamais de charge. */
const PRODUCTION_HOST_EXACT = Object.freeze([
  "www.avote.app",
  "avote.app",
  "avote-app.vercel.app",
  "avoteapp-production.up.railway.app",
]);

const PRODUCTION_HOST_SUFFIXES = Object.freeze([
  ".avote.app",
  "-production.up.railway.app",
]);

/**
 * @param {string} hostname
 * @returns {boolean}
 */
function isProductionHostname(hostname) {
  const h = String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
  if (!h) return false;
  if (PRODUCTION_HOST_EXACT.includes(h)) return true;
  for (const suffix of PRODUCTION_HOST_SUFFIXES) {
    if (h.endsWith(suffix)) return true;
  }
  // Previews Vercel prod-like slug sans "-git-"
  if (h === "avote-app.vercel.app") return true;
  return false;
}

/**
 * @param {string} rawUrl
 * @returns {{ ok: true; url: URL } | { ok: false; code: string; error: string }}
 */
function assertLoadTargetAllowed(rawUrl) {
  const s = String(rawUrl || "").trim();
  if (!s) {
    return {
      ok: false,
      code: "LOAD_URL_MISSING",
      error: "LOAD_API_URL (ou --api-url) requis.",
    };
  }
  let url;
  try {
    url = new URL(s);
  } catch {
    return {
      ok: false,
      code: "LOAD_URL_INVALID",
      error: `URL invalide : ${s}`,
    };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      ok: false,
      code: "LOAD_URL_PROTOCOL",
      error: "Protocole autorisé : http ou https.",
    };
  }
  if (isProductionHostname(url.hostname)) {
    return {
      ok: false,
      code: "LOAD_PROD_BLOCKED",
      error: `Cible de production refusée : ${url.hostname}. Utilisez un staging isolé.`,
    };
  }
  return { ok: true, url };
}

/**
 * Double confirmation pour un run réseau.
 * @param {{
 *   apiUrl?: string;
 *   allowRun?: unknown;
 *   confirmIsolated?: unknown;
 * }} input
 */
function assertLoadRunAuthorized(input = {}) {
  const target = assertLoadTargetAllowed(input.apiUrl);
  if (!target.ok) return target;

  const allow =
    input.allowRun === true ||
    String(input.allowRun || "").trim() === "1" ||
    String(input.allowRun || "").toLowerCase() === "true";
  if (!allow) {
    return {
      ok: false,
      code: "LOAD_RUN_LOCKED",
      error:
        "Run réseau verrouillé. Passez LOAD_ALLOW_RUN=1 et --confirm-isolated-staging après validation du staging.",
    };
  }

  const confirm =
    input.confirmIsolated === true ||
    String(input.confirmIsolated || "").trim() === "1" ||
    String(input.confirmIsolated || "").toLowerCase() === "true";
  if (!confirm) {
    return {
      ok: false,
      code: "LOAD_STAGING_UNCONFIRMED",
      error:
        "Confirmation staging manquante (--confirm-isolated-staging ou LOAD_CONFIRM_ISOLATED=1).",
    };
  }

  return { ok: true, url: target.url };
}

module.exports = {
  PRODUCTION_HOST_EXACT,
  PRODUCTION_HOST_SUFFIXES,
  isProductionHostname,
  assertLoadTargetAllowed,
  assertLoadRunAuthorized,
};
