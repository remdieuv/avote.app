const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/** URL absolue API (SSR, métadonnées, assets, participant / Screen). */
const API_URL = RAW_API_URL;

/** WebSocket : même machine que l’API en local (ex. http://localhost:4000). */
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || RAW_API_URL;

/**
 * Base HTTP pour les `fetch()` **navigateur** admin / auth (cookie httpOnly).
 *
 * Priorité :
 * 1. `NEXT_PUBLIC_API_BROWSER_BASE` si défini (dev local recommandé :
 *    `http://localhost:4000` → Express direct, sans Route Handler)
 * 2. Sinon `/api/backend` → Route Handler (production / same-origin)
 *
 * Ne pas hardcoder `/api/backend` ailleurs : toujours `apiBaseBrowser()`.
 */
function apiBaseBrowser() {
  const b = process.env.NEXT_PUBLIC_API_BROWSER_BASE;
  if (typeof b === "string" && b.trim() !== "") {
    return b.replace(/\/$/, "");
  }
  if (typeof window === "undefined") {
    return RAW_API_URL;
  }
  return "/api/backend";
}

/** True si le navigateur parle à Express sans passer par `/api/backend`. */
function isBrowserApiDirectToBackend() {
  const base = apiBaseBrowser();
  return /^https?:\/\//i.test(base);
}

/** Envoie les cookies de session vers l’API (same-origin ou CORS localhost). */
function adminFetch(input, init = {}) {
  return fetch(input, { ...init, credentials: "include" });
}

export {
  API_URL,
  SOCKET_URL,
  apiBaseBrowser,
  isBrowserApiDirectToBackend,
  adminFetch,
};
