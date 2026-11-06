/**
 * Lot D — profils organisateurs (Particulier / Organisation).
 * Jamais de displayName dérivé automatiquement de l’e-mail.
 */

const PROFILE_TYPES = Object.freeze({
  PERSONAL: "PERSONAL",
  ORGANIZATION: "ORGANIZATION",
});

const DISPLAY_NAME_MAX = 80;
const BIO_MAX = 2000;
const WEBSITE_MAX = 500;
const SLUG_MAX = 64;

/**
 * @param {unknown} raw
 * @returns {"PERSONAL" | "ORGANIZATION" | null}
 */
function parseProfileType(raw) {
  if (typeof raw !== "string") return null;
  const u = raw.trim().toUpperCase();
  if (u === "PERSONAL" || u === "PARTICULIER") return PROFILE_TYPES.PERSONAL;
  if (u === "ORGANIZATION" || u === "ORGANISATION" || u === "ORG") {
    return PROFILE_TYPES.ORGANIZATION;
  }
  return null;
}

/**
 * @param {unknown} raw
 * @returns {string | null | undefined} undefined = invalide
 */
function normalizeDisplayName(raw) {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw !== "string") return undefined;
  const t = raw.trim().replace(/\s+/g, " ");
  if (t === "") return null;
  if (t.length > DISPLAY_NAME_MAX) return undefined;
  // Refuse un displayName qui ressemble à un e-mail collé tel quel.
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return undefined;
  return t;
}

/**
 * @param {unknown} raw
 * @returns {string | null | undefined}
 */
function normalizeBio(raw) {
  if (raw === null) return null;
  if (raw === undefined) return undefined;
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (t === "") return null;
  if (t.length > BIO_MAX) return undefined;
  return t;
}

/**
 * @param {unknown} raw
 * @returns {string | null | undefined}
 */
function normalizeWebsiteUrl(raw) {
  if (raw === null) return null;
  if (raw === undefined) return undefined;
  if (typeof raw !== "string") return undefined;
  const t = raw.trim();
  if (t === "") return null;
  if (t.length > WEBSITE_MAX) return undefined;
  if (!/^https?:\/\//i.test(t)) return undefined;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return undefined;
    return u.toString();
  } catch {
    return undefined;
  }
}

/**
 * @param {unknown} raw
 * @returns {boolean | undefined}
 */
function normalizeIsPublic(raw) {
  if (raw === undefined) return undefined;
  if (typeof raw === "boolean") return raw;
  return undefined;
}

/**
 * Slug URL-safe depuis un nom affiché (sans e-mail).
 * @param {string} displayName
 */
function slugifyDisplayName(displayName) {
  const base = String(displayName || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, SLUG_MAX);
  return base || "orga";
}

/**
 * @param {import("@prisma/client").PrismaClient | import("@prisma/client").Prisma.TransactionClient} prisma
 * @param {string} displayName
 * @param {string} [excludeId]
 */
async function allocateUniqueProfileSlug(prisma, displayName, excludeId) {
  const base = slugifyDisplayName(displayName).slice(0, 48) || "orga";
  for (let i = 0; i < 40; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`.slice(0, SLUG_MAX);
    const hit = await prisma.organizerProfile.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!hit) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`.slice(0, SLUG_MAX);
}

/**
 * Profil exposable via API / page publique.
 * @param {Record<string, any>} profile
 */
function isProfilePubliclyVisible(profile) {
  return Boolean(profile?.isPublic);
}

/**
 * Payload propriétaire (compte).
 * @param {Record<string, any>} profile
 * @param {(url: string|null|undefined) => string|null} [absolutize]
 */
function mapOwnerProfileJson(profile, absolutize) {
  const abs = typeof absolutize === "function" ? absolutize : (u) => u ?? null;
  return {
    id: profile.id,
    type: String(profile.type || "").toLowerCase(),
    slug: profile.slug,
    displayName: profile.displayName,
    bio: profile.bio ?? null,
    imageUrl: abs(profile.imageUrl),
    websiteUrl: profile.websiteUrl ?? null,
    isPublic: Boolean(profile.isPublic),
    createdAt:
      profile.createdAt instanceof Date
        ? profile.createdAt.toISOString()
        : profile.createdAt || null,
    updatedAt:
      profile.updatedAt instanceof Date
        ? profile.updatedAt.toISOString()
        : profile.updatedAt || null,
  };
}

/**
 * Payload public (sans ownerUserId / e-mail).
 * @param {Record<string, any>} profile
 * @param {(url: string|null|undefined) => string|null} [absolutize]
 */
function mapPublicProfileJson(profile, absolutize) {
  const owner = mapOwnerProfileJson(profile, absolutize);
  return {
    id: owner.id,
    type: owner.type,
    slug: owner.slug,
    displayName: owner.displayName,
    bio: owner.bio,
    imageUrl: owner.imageUrl,
    websiteUrl: owner.websiteUrl,
    /** Lot E : bouton Suivre — flag préparatoire uniquement. */
    canFollow: true,
    followAvailable: false,
  };
}

/**
 * Carte organisateur pour Discover.
 * @param {Record<string, any> | null | undefined} profile
 * @param {(url: string|null|undefined) => string|null} [absolutize]
 */
function mapDiscoverOrganizerCard(profile, absolutize) {
  if (!profile || !isProfilePubliclyVisible(profile)) return null;
  const abs = typeof absolutize === "function" ? absolutize : (u) => u ?? null;
  return {
    id: profile.id,
    slug: profile.slug,
    displayName: profile.displayName,
    type: String(profile.type || "").toLowerCase(),
    imageUrl: abs(profile.imageUrl),
    profilePath: `/organizers/${profile.slug}`,
  };
}

module.exports = {
  PROFILE_TYPES,
  DISPLAY_NAME_MAX,
  BIO_MAX,
  WEBSITE_MAX,
  parseProfileType,
  normalizeDisplayName,
  normalizeBio,
  normalizeWebsiteUrl,
  normalizeIsPublic,
  slugifyDisplayName,
  allocateUniqueProfileSlug,
  isProfilePubliclyVisible,
  mapOwnerProfileJson,
  mapPublicProfileJson,
  mapDiscoverOrganizerCard,
};
