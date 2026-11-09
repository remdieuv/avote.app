/**
 * Lot E — favoris événements & organisateurs suivis.
 * Pas de notifications. Pas de droits supplémentaires sur le privé.
 */

const { EVENT_VISIBILITY, isEventPublic } = require("./eventVisibility");
const {
  isProfilePubliclyVisible,
  mapPublicProfileJson,
} = require("./organizerProfiles");
const {
  resolveDiscoverCategory,
  mapDiscoverEventCard,
} = require("./discoverEvents");

/**
 * Un événement peut être mis en favori s’il est PUBLIC.
 * @param {{ visibility?: unknown }} event
 */
function canFavoriteEvent(event) {
  return isEventPublic(event?.visibility);
}

/**
 * Un profil peut être suivi s’il est public.
 * @param {{ isPublic?: unknown }} profile
 */
function canFollowProfile(profile) {
  return isProfilePubliclyVisible(profile);
}

/**
 * Carte favori affichable (événement encore public).
 * @param {Record<string, any>} event
 * @param {(url: string|null|undefined) => string|null} [absolutize]
 */
function mapFavoriteEventCard(event, absolutize) {
  if (!canFavoriteEvent(event)) return null;
  const cat = resolveDiscoverCategory(event) || null;
  const card = mapDiscoverEventCard(
    { ...event, discoverCategory: cat },
    absolutize,
  );
  return {
    ...card,
    favorited: true,
  };
}

/**
 * @param {Record<string, any>} profile
 * @param {(url: string|null|undefined) => string|null} [absolutize]
 */
function mapFollowingOrganizerCard(profile, absolutize) {
  if (!canFollowProfile(profile)) return null;
  const pub = mapPublicProfileJson(profile, absolutize);
  return {
    id: pub.id,
    type: pub.type,
    slug: pub.slug,
    displayName: pub.displayName,
    bio: pub.bio,
    imageUrl: pub.imageUrl,
    websiteUrl: pub.websiteUrl,
    profilePath: `/organizers/${pub.slug}`,
    isFollowing: true,
  };
}

module.exports = {
  EVENT_VISIBILITY,
  canFavoriteEvent,
  canFollowProfile,
  mapFavoriteEventCard,
  mapFollowingOrganizerCard,
};
