/**
 * Hop Next Route Handler → Express (loopback).
 * Évite la réutilisation keep-alive Undici (EADDRINUSE Windows) + 1 retry max.
 */

/**
 * @param {unknown} err
 * @returns {boolean}
 */
export function isEaddrInUseCause(err) {
  let cur = err;
  const seen = new Set();
  while (cur && typeof cur === "object" && !seen.has(cur)) {
    seen.add(cur);
    if (/** @type {{ code?: string }} */ (cur).code === "EADDRINUSE") {
      return true;
    }
    cur = /** @type {{ cause?: unknown }} */ (cur).cause;
  }
  return false;
}

/**
 * fetch upstream avec `Connection: close` (pas de pool keep-alive) et
 * au plus un second essai si la cause est explicitement EADDRINUSE.
 * Les réponses HTTP Express (4xx/5xx) ne throw pas → pas de retry.
 *
 * @param {string} url
 * @param {RequestInit} init
 * @param {{ fetchImpl?: typeof fetch }} [opts]
 * @returns {Promise<Response>}
 */
export async function fetchUpstreamWithEaddrRetry(url, init, opts = {}) {
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const headers = new Headers(init.headers ?? undefined);
  headers.set("connection", "close");
  const nextInit = { ...init, headers };

  try {
    return await fetchImpl(url, nextInit);
  } catch (err) {
    if (!isEaddrInUseCause(err)) throw err;
    return await fetchImpl(url, nextInit);
  }
}
