/**
 * Lot F — invitations événements privés + contrôle d’accès souvenirs.
 * Ne gate jamais /join ni le vote live.
 */

const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const INVITE_CODE_BYTES = 4; // 8 hex chars
const INVITE_BCRYPT_ROUNDS = 10;
const INVITE_CODE_MIN_LEN = 6;
const INVITE_CODE_MAX_LEN = 32;

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
function normalizeInviteCodeInput(raw) {
  if (typeof raw !== "string") return null;
  const t = raw.trim().replace(/\s+/g, "");
  if (t.length < INVITE_CODE_MIN_LEN || t.length > INVITE_CODE_MAX_LEN) return null;
  return t.toUpperCase();
}

/** Génère un code court lisible (hex majuscules). */
function generateInviteCode() {
  return crypto.randomBytes(INVITE_CODE_BYTES).toString("hex").toUpperCase();
}

/**
 * @param {string} plainCode
 * @returns {Promise<string>}
 */
async function hashInviteCode(plainCode) {
  const normalized = normalizeInviteCodeInput(plainCode);
  if (!normalized) {
    throw new Error("Code d’invitation invalide.");
  }
  return bcrypt.hash(normalized, INVITE_BCRYPT_ROUNDS);
}

/**
 * @param {string} plainCode
 * @param {string | null | undefined} hash
 */
async function verifyInviteCode(plainCode, hash) {
  if (typeof hash !== "string" || !hash.trim()) return false;
  const normalized = normalizeInviteCodeInput(plainCode);
  if (!normalized) return false;
  try {
    return await bcrypt.compare(normalized, hash);
  } catch {
    return false;
  }
}

/**
 * Soft-gate actif ? (Landing souvenirs protégés)
 * @param {{ inviteEnabled?: unknown }} event
 */
function isInviteProtectionEnabled(event) {
  return event?.inviteEnabled === true;
}

/**
 * Médias servis en mode protégé (URL signées / authenticated).
 * @param {{ mediaProtectionEnabled?: unknown }} event
 */
function isMediaProtectionEnabled(event) {
  return event?.mediaProtectionEnabled === true;
}

/**
 * @param {{
 *   event: { userId?: string | null; inviteEnabled?: boolean };
 *   userId?: string | null;
 *   isAdmin?: boolean;
 *   hasGuestGrant?: boolean;
 * }} args
 */
function canAccessProtectedSouvenirs(args) {
  const event = args?.event;
  if (!event) return false;
  if (!isInviteProtectionEnabled(event)) return true;
  const uid =
    typeof args.userId === "string" && args.userId.trim()
      ? args.userId.trim()
      : "";
  if (!uid) return false;
  if (args.isAdmin === true) return true;
  if (event.userId && event.userId === uid) return true;
  return args.hasGuestGrant === true;
}

/**
 * Meta publique page /invite/[slug] — sans souvenirs ni code.
 * @param {{
 *   id: string;
 *   slug: string;
 *   title: string;
 *   landingTitle?: string | null;
 *   inviteEnabled?: boolean;
 *   landingEnabled?: boolean;
 *   visibility?: unknown;
 * }} event
 * @param {{ hasAccess?: boolean; isOwner?: boolean }} [viewer]
 */
function mapInviteAccessMeta(event, viewer = {}) {
  const title =
    (typeof event.landingTitle === "string" && event.landingTitle.trim()) ||
    event.title ||
    "Événement";
  const protected_ = isInviteProtectionEnabled(event);
  return {
    slug: event.slug,
    title,
    landingEnabled: Boolean(event.landingEnabled),
    inviteEnabled: protected_,
    requiresAuth: protected_,
    requiresCode: protected_ && !viewer.hasAccess && !viewer.isOwner,
    hasAccess: Boolean(viewer.hasAccess || viewer.isOwner),
    isOwner: Boolean(viewer.isOwner),
    invitePath: `/invite/${event.slug}`,
    landingPath: event.landingEnabled ? `/e/${event.slug}` : null,
    joinPath: `/join/${event.slug}`,
  };
}

/**
 * Payload orga (jamais le code en clair sauf juste après create/rotate).
 * @param {Record<string, any>} event
 * @param {{ plaintextCode?: string | null; guestCount?: number }} [extra]
 */
function mapOwnerInviteJson(event, extra = {}) {
  const enabled = isInviteProtectionEnabled(event);
  return {
    inviteEnabled: enabled,
    mediaProtectionEnabled: isMediaProtectionEnabled(event),
    hasInviteCode: Boolean(event.inviteCodeHash),
    inviteCodeUpdatedAt: event.inviteCodeUpdatedAt
      ? new Date(event.inviteCodeUpdatedAt).toISOString()
      : null,
    invitePath: `/invite/${event.slug}`,
    inviteUrlPath: `/invite/${event.slug}`,
    guestCount:
      typeof extra.guestCount === "number" ? extra.guestCount : undefined,
    /** Présent uniquement juste après génération / renouvellement. */
    inviteCode:
      typeof extra.plaintextCode === "string" ? extra.plaintextCode : undefined,
    warnings: {
      activation:
        "Une fois activée, les souvenirs de la Landing ne seront accessibles qu’avec un compte AVOTE et le code d’invitation. Le live (/join) et le vote restent ouverts sans code. Les liens /e partagés jusqu’ici cesseront d’afficher les souvenirs aux personnes non invitées.",
      mediaMigration:
        "Les photos déjà publiées seront migrées vers un stockage protégé. L’activation n’est confirmée que si cette migration réussit.",
      rotate:
        "Renouveler le code n’enlève pas l’accès aux personnes déjà autorisées. Seuls les nouveaux invités devront utiliser le nouveau code.",
    },
  };
}

module.exports = {
  INVITE_CODE_MIN_LEN,
  INVITE_CODE_MAX_LEN,
  normalizeInviteCodeInput,
  generateInviteCode,
  hashInviteCode,
  verifyInviteCode,
  isInviteProtectionEnabled,
  isMediaProtectionEnabled,
  canAccessProtectedSouvenirs,
  mapInviteAccessMeta,
  mapOwnerInviteJson,
};
