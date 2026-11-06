/**
 * Lot A — Visibilité événement (PUBLIC / PRIVATE).
 * Ne gouverne PAS l’accès /join ni le vote.
 * Ne gate PAS la Landing (Lot F : invitations / souvenirs).
 */

const EVENT_VISIBILITY = Object.freeze({
  PRIVATE: "PRIVATE",
  PUBLIC: "PUBLIC",
});

/**
 * @param {unknown} raw
 * @returns {"PRIVATE" | "PUBLIC" | null}
 */
function parseEventVisibility(raw) {
  if (typeof raw !== "string") return null;
  const u = raw.trim().toUpperCase();
  if (u === EVENT_VISIBILITY.PRIVATE || u === EVENT_VISIBILITY.PUBLIC) {
    return u;
  }
  return null;
}

/**
 * Normalise une valeur DB / API en enum uppercase.
 * @param {unknown} raw
 * @returns {"PRIVATE" | "PUBLIC"}
 */
function normalizeEventVisibility(raw) {
  return parseEventVisibility(raw) || EVENT_VISIBILITY.PRIVATE;
}

/**
 * @param {unknown} visibility
 * @returns {boolean}
 */
function isEventPublic(visibility) {
  return normalizeEventVisibility(visibility) === EVENT_VISIBILITY.PUBLIC;
}

/**
 * Éligibilité Discover (Lot D) : PUBLIC + thème + startsAt + profil orga.
 * Si `organizerProfile` est joint : il doit être public.
 * @param {{
 *   visibility?: unknown;
 *   primaryThemeId?: unknown;
 *   startsAt?: unknown;
 *   organizerProfileId?: unknown;
 *   organizerProfile?: { isPublic?: unknown } | null;
 * }} event
 */
function isDiscoverEligible(event) {
  if (!isEventPublic(event?.visibility)) return false;
  const themeId =
    typeof event?.primaryThemeId === "string"
      ? event.primaryThemeId.trim()
      : "";
  if (!themeId) return false;
  if (event?.startsAt == null) return false;
  if (event.startsAt instanceof Date && Number.isNaN(event.startsAt.getTime())) {
    return false;
  }
  const profileId =
    typeof event?.organizerProfileId === "string"
      ? event.organizerProfileId.trim()
      : "";
  if (!profileId) return false;
  if (
    event?.organizerProfile &&
    typeof event.organizerProfile === "object" &&
    event.organizerProfile.isPublic === false
  ) {
    return false;
  }
  return true;
}

/**
 * Directive robots pour surfaces éditoriales (Landing / profils futurs).
 * /join reste noindex côté produit (expérience live).
 * @param {{ visibility?: unknown; landingEnabled?: unknown }} event
 * @returns {{ index: boolean; follow: boolean; robots: string }}
 */
function eventLandingRobots(event) {
  const publicVisible = isEventPublic(event?.visibility);
  const landingOn = Boolean(event?.landingEnabled);
  const index = publicVisible && landingOn;
  return {
    index,
    follow: index,
    robots: index ? "index,follow" : "noindex,nofollow",
  };
}

/**
 * Valide un changement de visibilité.
 * Passage PRIVATE → PUBLIC exige confirmPublic === true (confirmation explicite).
 *
 * @param {{
 *   currentVisibility?: unknown;
 *   nextVisibility?: unknown;
 *   confirmPublic?: unknown;
 * }} args
 * @returns {{
 *   ok: true;
 *   visibility: "PRIVATE" | "PUBLIC";
 *   becomingPublic: boolean;
 *   becomingPrivate: boolean;
 * } | {
 *   ok: false;
 *   status: number;
 *   error: string;
 *   code?: string;
 * }}
 */
function validateVisibilityChange(args) {
  const current = normalizeEventVisibility(args?.currentVisibility);
  const next = parseEventVisibility(args?.nextVisibility);
  if (!next) {
    return {
      ok: false,
      status: 400,
      error: 'visibility doit être "PRIVATE" ou "PUBLIC".',
      code: "INVALID_VISIBILITY",
    };
  }
  if (next === current) {
    return {
      ok: true,
      visibility: next,
      becomingPublic: false,
      becomingPrivate: false,
    };
  }
  const becomingPublic = next === EVENT_VISIBILITY.PUBLIC;
  const becomingPrivate = next === EVENT_VISIBILITY.PRIVATE;
  if (becomingPublic && args?.confirmPublic !== true) {
    return {
      ok: false,
      status: 400,
      error:
        "Confirmation requise pour rendre l’événement public (confirmPublic: true).",
      code: "CONFIRM_PUBLIC_REQUIRED",
    };
  }
  return {
    ok: true,
    visibility: next,
    becomingPublic,
    becomingPrivate,
  };
}

/**
 * Payload API stable pour la visibilité.
 * @param {unknown} visibility
 */
function visibilityApiFields(visibility) {
  const v = normalizeEventVisibility(visibility);
  return {
    visibility: v.toLowerCase(),
    isPublic: v === EVENT_VISIBILITY.PUBLIC,
  };
}

module.exports = {
  EVENT_VISIBILITY,
  parseEventVisibility,
  normalizeEventVisibility,
  isEventPublic,
  isDiscoverEligible,
  eventLandingRobots,
  validateVisibilityChange,
  visibilityApiFields,
};
