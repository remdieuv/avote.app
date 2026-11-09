const crypto = require("crypto");
const { Readable } = require("stream");
const { v2: cloudinary } = require("cloudinary");

const CLOUDINARY_CLOUD_NAME = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
const CLOUDINARY_API_KEY = String(process.env.CLOUDINARY_API_KEY || "").trim();
const CLOUDINARY_API_SECRET = String(process.env.CLOUDINARY_API_SECRET || "").trim();

/** TTL URL signées souvenirs protégés (secondes). */
const SIGNED_URL_TTL_SEC = 15 * 60;

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

function assertCloudinaryConfigured() {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary non configuré (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET).");
  }
  if (!/^[a-z0-9_-]+$/i.test(CLOUDINARY_CLOUD_NAME)) {
    throw new Error(
      "CLOUDINARY_CLOUD_NAME invalide (attendu: nom de cloud seul, sans URL, ex: demo).",
    );
  }
}

function sanitizeSegment(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * @param {{
 *   buffer: Buffer;
 *   eventId?: string;
 *   profileId?: string;
 *   kind:
 *     | "logo"
 *     | "background"
 *     | "landing_cover"
 *     | "landing_photo"
 *     | "landing_showcase_photo"
 *     | "landing_message_photo"
 *     | "profile_image";
 *   authenticated?: boolean;
 * }} args
 * @returns {Promise<{secureUrl: string, publicId: string, deliveryType: "upload"|"authenticated"}>}
 */
function uploadImageBufferToCloudinary(args) {
  assertCloudinaryConfigured();
  const isProfile = args.kind === "profile_image";
  const scopeSafe = isProfile
    ? sanitizeSegment(args.profileId) || "profile"
    : sanitizeSegment(args.eventId) || "event";
  const kindSafe =
    args.kind === "background"
      ? "bg"
      : args.kind === "landing_cover"
        ? "lc"
        : args.kind === "landing_photo"
          ? "lp"
          : args.kind === "landing_showcase_photo"
            ? "ls"
            : args.kind === "landing_message_photo"
              ? "lm"
              : args.kind === "profile_image"
                ? "pf"
                : "logo";
  const publicId = `${kindSafe}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const landingTransform =
    args.kind === "landing_cover" ||
    args.kind === "landing_photo" ||
    args.kind === "landing_showcase_photo" ||
    args.kind === "landing_message_photo" ||
    args.kind === "profile_image"
      ? [
          {
            width: args.kind === "landing_cover" ? 1920 : args.kind === "profile_image" ? 800 : 1600,
            crop: "limit",
            quality: "auto",
            fetch_format: "auto",
          },
        ]
      : undefined;

  const useAuth =
    Boolean(args.authenticated) &&
    !isProfile &&
    args.kind !== "logo" &&
    args.kind !== "background";

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: isProfile
          ? `avote/profiles/${scopeSafe}`
          : `avote/events/${scopeSafe}`,
        public_id: publicId,
        resource_type: "image",
        type: useAuth ? "authenticated" : "upload",
        ...(landingTransform ? { transformation: landingTransform } : {}),
      },
      (err, result) => {
        if (err) return reject(err);
        if (!result?.secure_url || !result?.public_id) {
          return reject(new Error("Réponse Cloudinary invalide."));
        }
        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
          deliveryType: useAuth ? "authenticated" : "upload",
        });
      },
    );
    Readable.from(args.buffer).pipe(stream);
  });
}

/**
 * URL signée courte durée pour ressource authenticated (ou private).
 * @param {string} publicId
 * @param {{ ttlSec?: number; width?: number }} [opts]
 * @returns {string}
 */
function signedAuthenticatedImageUrl(publicId, opts = {}) {
  assertCloudinaryConfigured();
  const id = typeof publicId === "string" ? publicId.trim() : "";
  if (!id) throw new Error("publicId manquant.");
  const ttl =
    typeof opts.ttlSec === "number" && opts.ttlSec > 30
      ? Math.min(opts.ttlSec, 60 * 60)
      : SIGNED_URL_TTL_SEC;
  const expiresAt = Math.floor(Date.now() / 1000) + ttl;
  /** @type {Record<string, unknown>} */
  const options = {
    type: "authenticated",
    resource_type: "image",
    sign_url: true,
    secure: true,
    expires_at: expiresAt,
  };
  if (typeof opts.width === "number" && opts.width > 0) {
    options.transformation = [
      { width: opts.width, crop: "limit", quality: "auto", fetch_format: "auto" },
    ];
  }
  return cloudinary.url(id, options);
}

/**
 * Migre une ressource `upload` publique → `authenticated`.
 * Ne détruit rien sans succès de la cible.
 * @param {string} publicId
 * @returns {Promise<{ ok: true, publicId: string } | { ok: false, error: string }>}
 */
async function migrateUploadToAuthenticated(publicId) {
  const id = typeof publicId === "string" ? publicId.trim() : "";
  if (!id) return { ok: false, error: "publicId manquant" };
  try {
    assertCloudinaryConfigured();
  } catch (e) {
    return { ok: false, error: e?.message || "Cloudinary non configuré" };
  }
  const targetId = id.endsWith("-auth") ? id : `${id}-auth`;
  try {
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.rename(
        id,
        targetId,
        {
          resource_type: "image",
          type: "upload",
          to_type: "authenticated",
          overwrite: true,
          invalidate: true,
        },
        (err, res) => (err ? reject(err) : resolve(res)),
      );
    });
    const newId =
      typeof result?.public_id === "string" && result.public_id.trim()
        ? result.public_id.trim()
        : targetId;
    // Vérifie qu'une URL signée se construit (pas de fetch réseau obligatoire).
    signedAuthenticatedImageUrl(newId, { ttlSec: 60 });
    return { ok: true, publicId: newId };
  } catch (e) {
    // Déjà authenticated ?
    try {
      signedAuthenticatedImageUrl(id, { ttlSec: 60 });
      const probe = await new Promise((resolve, reject) => {
        cloudinary.api.resource(
          id,
          { resource_type: "image", type: "authenticated" },
          (err, res) => (err ? reject(err) : resolve(res)),
        );
      });
      if (probe?.public_id) {
        return { ok: true, publicId: probe.public_id };
      }
    } catch {
      /* fallthrough */
    }
    return {
      ok: false,
      error: e?.message || "Échec migration Cloudinary authenticated",
    };
  }
}

/**
 * Supprime une ressource Cloudinary (best-effort, ignore si non configuré).
 * @param {string | null | undefined} publicId
 * @param {{ type?: "upload"|"authenticated"|"private" }} [opts]
 */
function destroyCloudinaryByPublicId(publicId, opts = {}) {
  const id = typeof publicId === "string" ? publicId.trim() : "";
  if (!id) return Promise.resolve(false);
  try {
    assertCloudinaryConfigured();
  } catch {
    return Promise.resolve(false);
  }
  const type = opts.type || "upload";
  return new Promise((resolve) => {
    cloudinary.uploader.destroy(
      id,
      { resource_type: "image", type },
      (err, result) => {
        if (err) {
          console.warn("cloudinary.destroy", id, err.message || err);
          resolve(false);
          return;
        }
        resolve(result?.result === "ok");
      },
    );
  });
}

module.exports = {
  SIGNED_URL_TTL_SEC,
  uploadImageBufferToCloudinary,
  destroyCloudinaryByPublicId,
  signedAuthenticatedImageUrl,
  migrateUploadToAuthenticated,
};
