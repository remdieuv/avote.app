const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/** URL absolue API (SSR, métadonnées, assets). */
const API_URL = RAW_API_URL;

/** WebSocket : souvent la même machine que l’API (ex. http://localhost:4000). */
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || RAW_API_URL;

/**
 * Base utilisée dans les `fetch()` du navigateur pour l’admin (cookie httpOnly).
 * En dev avec Next : définir `NEXT_PUBLIC_API_BROWSER_BASE=/api/backend` et un rewrite
 * vers le backend (voir `next.config.mjs`).
 */
function apiBaseBrowser() {
  if (typeof window === "undefined") {
    return RAW_API_URL;
  }
  const b = process.env.NEXT_PUBLIC_API_BROWSER_BASE;
  if (b && typeof b === "string" && b.trim() !== "") {
    return b.replace(/\/$/, "");
  }
  /**
   * Par défaut : proxy Next (`app/api/backend/...` ou rewrite) pour cookies same-origin.
   * Évite le 404 si NEXT_PUBLIC_API_URL pointe par erreur vers le front ou en `next start`
   * sans URL absolue vers Express.
   */
  return "/api/backend";
}

/** Envoie les cookies de session vers l’API (même site ou proxy). */
function adminFetch(input, init = {}) {
  return fetch(input, { ...init, credentials: "include" });
}

export { API_URL, SOCKET_URL, apiBaseBrowser, adminFetch };
