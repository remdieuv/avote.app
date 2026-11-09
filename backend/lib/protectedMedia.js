/**
 * Lot F — résolution d’URL médias Landing (public vs signé).
 */

const {
  signedAuthenticatedImageUrl,
  migrateUploadToAuthenticated,
} = require("./cloudinary");
const { isMediaProtectionEnabled } = require("./eventInvites");

/** Marqueur stocké en base quand l’URL publique n’est plus la source de vérité. */
const PROTECTED_URL_PREFIX = "protected://";

/**
 * @param {string | null | undefined} url
 */
function isProtectedUrlMarker(url) {
  return typeof url === "string" && url.startsWith(PROTECTED_URL_PREFIX);
}

/**
 * @param {string} publicId
 */
function toProtectedUrlMarker(publicId) {
  return `${PROTECTED_URL_PREFIX}${String(publicId || "").trim()}`;
}

/**
 * @param {string | null | undefined} storedUrl
 * @param {string | null | undefined} publicId
 * @param {{ mediaProtectionEnabled?: boolean }} event
 * @param {(url: string|null|undefined) => string|null} absolutize
 * @returns {string | null}
 */
function resolveDeliverableMediaUrl(storedUrl, publicId, event, absolutize) {
  if (isMediaProtectionEnabled(event)) {
    const id =
      (typeof publicId === "string" && publicId.trim()) ||
      (isProtectedUrlMarker(storedUrl)
        ? String(storedUrl).slice(PROTECTED_URL_PREFIX.length)
        : "");
    if (!id) {
      // Pas de publicId → ne pas renvoyer une éventuelle URL Cloudinary publique.
      return null;
    }
    try {
      return signedAuthenticatedImageUrl(id);
    } catch {
      return null;
    }
  }
  if (isProtectedUrlMarker(storedUrl)) {
    return null;
  }
  return typeof absolutize === "function"
    ? absolutize(storedUrl)
    : storedUrl || null;
}

/**
 * Migre cover + photos Landing vers Cloudinary authenticated.
 * N’active la protection que si TOUTES les ressources avec publicId réussissent.
 * Les lignes sans publicId (legacy /uploads) bloquent l’activation.
 *
 * @param {{
 *   prisma: import("@prisma/client").PrismaClient;
 *   eventId: string;
 * }} args
 * @returns {Promise<{ ok: true, migrated: number } | { ok: false, error: string, failed?: string[] }>}
 */
async function migrateEventLandingMediaToProtected(args) {
  const { prisma, eventId } = args;
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      landingCoverUrl: true,
      // cover n’a pas de publicId dédié en schéma — on tente d’extraire depuis l’URL si possible
      landingPhotos: { select: { id: true, url: true, cloudinaryPublicId: true } },
      landingShowcasePhotos: {
        select: { id: true, url: true, cloudinaryPublicId: true },
      },
    },
  });
  if (!event) return { ok: false, error: "Événement introuvable." };

  /** @type {{ kind: string; id: string; publicId: string | null; url: string | null }[]} */
  const assets = [];

  // Cover : pas de colonne publicId — on ne peut migrer que si l’URL Cloudinary contient un public_id récupérable via API, sinon on exige une re-upload.
  // Stratégie : si cover est https cloudinary, tenter d’extraire le path après /upload/…
  if (event.landingCoverUrl) {
    const extracted = extractCloudinaryPublicIdFromUrl(event.landingCoverUrl);
    assets.push({
      kind: "cover",
      id: "cover",
      publicId: extracted,
      url: event.landingCoverUrl,
    });
  }

  for (const p of event.landingPhotos || []) {
    assets.push({
      kind: "photo",
      id: p.id,
      publicId: p.cloudinaryPublicId || extractCloudinaryPublicIdFromUrl(p.url),
      url: p.url,
    });
  }
  for (const p of event.landingShowcasePhotos || []) {
    assets.push({
      kind: "showcase",
      id: p.id,
      publicId: p.cloudinaryPublicId || extractCloudinaryPublicIdFromUrl(p.url),
      url: p.url,
    });
  }

  const failed = [];
  /** @type {{ kind: string; id: string; newPublicId: string }[]} */
  const succeeded = [];

  for (const asset of assets) {
    if (!asset.publicId) {
      failed.push(`${asset.kind}:${asset.id}:pas_de_publicId`);
      continue;
    }
    const mig = await migrateUploadToAuthenticated(asset.publicId);
    if (!mig.ok) {
      failed.push(`${asset.kind}:${asset.id}:${mig.error}`);
      continue;
    }
    succeeded.push({ kind: asset.kind, id: asset.id, newPublicId: mig.publicId });
  }

  if (failed.length > 0) {
    return {
      ok: false,
      error:
        "Migration médias incomplète — protection non activée. Corrigez ou re-uploadez les fichiers concernés, puis réessayez.",
      failed,
    };
  }

  // Persistance marqueurs uniquement après succès total.
  for (const s of succeeded) {
    const marker = toProtectedUrlMarker(s.newPublicId);
    if (s.kind === "cover") {
      await prisma.event.update({
        where: { id: eventId },
        data: { landingCoverUrl: marker },
      });
    } else if (s.kind === "photo") {
      await prisma.eventLandingPhoto.update({
        where: { id: s.id },
        data: { url: marker, cloudinaryPublicId: s.newPublicId },
      });
    } else if (s.kind === "showcase") {
      await prisma.eventLandingShowcasePhoto.update({
        where: { id: s.id },
        data: { url: marker, cloudinaryPublicId: s.newPublicId },
      });
    }
  }

  return { ok: true, migrated: succeeded.length };
}

/**
 * Extrait un public_id approximatif depuis une URL Cloudinary delivery.
 * @param {string | null | undefined} url
 * @returns {string | null}
 */
function extractCloudinaryPublicIdFromUrl(url) {
  if (typeof url !== "string" || !url.trim()) return null;
  if (isProtectedUrlMarker(url)) {
    return url.slice(PROTECTED_URL_PREFIX.length) || null;
  }
  try {
    const u = new URL(url);
    if (!/\.cloudinary\.com$/i.test(u.hostname) && !u.hostname.includes("cloudinary")) {
      return null;
    }
    // .../upload/v123/folder/name.ext ou .../authenticated/s--xx--/v123/...
    const parts = u.pathname.split("/").filter(Boolean);
    const uploadIdx = parts.findIndex((p) => p === "upload" || p === "authenticated");
    if (uploadIdx < 0) return null;
    let rest = parts.slice(uploadIdx + 1);
    // strip transforms segments until version vNNNN
    while (rest.length && !/^v\d+$/i.test(rest[0]) && rest[0].includes(",")) {
      rest = rest.slice(1);
    }
    if (rest.length && /^v\d+$/i.test(rest[0])) rest = rest.slice(1);
    if (!rest.length) return null;
    const last = rest[rest.length - 1].replace(/\.[a-z0-9]+$/i, "");
    rest[rest.length - 1] = last;
    return rest.join("/");
  } catch {
    return null;
  }
}

module.exports = {
  PROTECTED_URL_PREFIX,
  isProtectedUrlMarker,
  toProtectedUrlMarker,
  resolveDeliverableMediaUrl,
  migrateEventLandingMediaToProtected,
  extractCloudinaryPublicIdFromUrl,
};
