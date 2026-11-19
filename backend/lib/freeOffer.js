/**
 * Offre gratuite permanente — 10 participants / événement.
 * Hors catalogue packs payants (P50…P1000).
 */

const FREE_PARTICIPANTS_LIMIT = 10;
const FREE_PLAN_TYPE = "FREE";

/**
 * @param {unknown} body
 * @returns {boolean}
 */
function wantsFreeStartReal(body) {
  if (!body || typeof body !== "object") return false;
  if (body.free === true) return true;
  const plan = String(body.planType || body.plan || "")
    .trim()
    .toUpperCase();
  return plan === FREE_PLAN_TYPE;
}

module.exports = {
  FREE_PARTICIPANTS_LIMIT,
  FREE_PLAN_TYPE,
  wantsFreeStartReal,
};
