/**
 * Display indépendant de l’écran B — mémoire process (pas de colonne DB V1).
 * Survit au F5 côté clients via rejoue sur screen:join ; perdu au restart serveur
 * (repli localStorage côté ScreenProjection).
 */

/** @type {ReadonlySet<string>} */
const ALLOWED = new Set(["question", "results", "waiting", "black"]);

/** @type {Map<string, string>} eventId → display lowercase */
const store = new Map();

/**
 * @param {unknown} raw
 * @returns {"question" | "results" | "waiting" | "black" | null}
 */
function normalize(raw) {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (ALLOWED.has(v)) {
    return /** @type {"question" | "results" | "waiting" | "black"} */ (v);
  }
  return null;
}

/**
 * @param {unknown} eventId
 * @param {unknown} displayState
 * @returns {string | null} valeur stockée
 */
function setScreenBIndependentDisplay(eventId, displayState) {
  const id = String(eventId || "").trim();
  const ds = normalize(displayState);
  if (!id || !ds) return null;
  store.set(id, ds);
  return ds;
}

/**
 * @param {unknown} eventId
 * @returns {string | null}
 */
function getScreenBIndependentDisplay(eventId) {
  const id = String(eventId || "").trim();
  if (!id) return null;
  return store.get(id) || null;
}

/**
 * @param {unknown} eventId
 */
function clearScreenBIndependentDisplay(eventId) {
  const id = String(eventId || "").trim();
  if (!id) return false;
  return store.delete(id);
}

/** @internal tests */
function _resetScreenBIndependentDisplayStore() {
  store.clear();
}

module.exports = {
  setScreenBIndependentDisplay,
  getScreenBIndependentDisplay,
  clearScreenBIndependentDisplay,
  _resetScreenBIndependentDisplayStore,
};
