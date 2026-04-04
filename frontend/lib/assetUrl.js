import { API_URL } from "./config";

/**
 * Réécrit les URLs des fichiers hébergés sur l’API (`/uploads/...`) pour le navigateur.
 * Quand le serveur a généré une URL avec une mauvaise origine (ex. `http://localhost:4000`
 * si `PUBLIC_API_ORIGIN` n’est pas défini en prod), le client charge quand même depuis
 * `NEXT_PUBLIC_API_URL`.
 *
 * @param {string | null | undefined} url
 * @returns {string} chaîne vide si pas d’URL exploitable
 */
export function resolveApiAssetUrl(url) {
  if (url == null || typeof url !== "string") return "";
  const t = url.trim();
  if (!t) return "";
  const base = String(API_URL || "").replace(/\/$/, "");
  if (!base) return t;

  if (t.startsWith("/uploads/")) {
    return `${base}${t}`;
  }

  try {
    const u = new URL(t);
    if (u.pathname.startsWith("/uploads/")) {
      return `${base}${u.pathname}${u.search}`;
    }
  } catch {
    return t;
  }

  return t;
}

/**
 * @param {string | null | undefined} url
 * @returns {string | null}
 */
export function resolveApiAssetUrlNullable(url) {
  const r = resolveApiAssetUrl(url);
  return r === "" ? null : r;
}
