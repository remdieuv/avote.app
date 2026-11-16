/**
 * Clés de rate-limit pour POST /polls/:pollId/vote.
 * Identité anti-abus principale = voterSessionId (pas l’IP seule).
 */

/**
 * @param {import("express").Request} req
 * @returns {string}
 */
function voteSessionRateLimitKey(req) {
  const raw = req?.body?.voterSessionId;
  const sid = typeof raw === "string" ? raw.trim() : "";
  if (sid) return `vs:${sid}`;
  const ip = typeof req?.ip === "string" && req.ip ? req.ip : "unknown";
  return `ip-fallback:${ip}`;
}

/**
 * @param {import("express").Request} req
 * @returns {string}
 */
function voteIpRateLimitKey(req) {
  const ip = typeof req?.ip === "string" && req.ip ? req.ip : "unknown";
  return `ip:${ip}`;
}

module.exports = {
  voteSessionRateLimitKey,
  voteIpRateLimitKey,
};
