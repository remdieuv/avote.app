const crypto = require("crypto");
const { Readable } = require("stream");
const { v2: cloudinary } = require("cloudinary");

const CLOUDINARY_CLOUD_NAME = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
const CLOUDINARY_API_KEY = String(process.env.CLOUDINARY_API_KEY || "").trim();
const CLOUDINARY_API_SECRET = String(process.env.CLOUDINARY_API_SECRET || "").trim();

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
 * @param {{buffer: Buffer, eventId: string, kind: "logo" | "background" | "landing_cover" | "landing_photo" | "landing_showcase_photo"}} args
 * @returns {Promise<{secureUrl: string, publicId: string}>}
 */
function uploadImageBufferToCloudinary(args) {
  assertCloudinaryConfigured();
  const eventSafe = sanitizeSegment(args.eventId) || "event";
  const kindSafe =
    args.kind === "background"
      ? "bg"
      : args.kind === "landing_cover"
        ? "lc"
        : args.kind === "landing_photo"
          ? "lp"
          : args.kind === "landing_showcase_photo"
            ? "ls"
            : "logo";
  const publicId = `${kindSafe}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  const landingTransform =
    args.kind === "landing_cover" ||
    args.kind === "landing_photo" ||
    args.kind === "landing_showcase_photo"
      ? [
          {
            width: args.kind === "landing_cover" ? 1920 : 1600,
            crop: "limit",
            quality: "auto",
            fetch_format: "auto",
          },
        ]
      : undefined;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `avote/events/${eventSafe}`,
        public_id: publicId,
        resource_type: "image",
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
        });
      },
    );
    Readable.from(args.buffer).pipe(stream);
  });
}

/**
 * Supprime une ressource Cloudinary (best-effort, ignore si non configuré).
 * @param {string | null | undefined} publicId
 */
function destroyCloudinaryByPublicId(publicId) {
  const id = typeof publicId === "string" ? publicId.trim() : "";
  if (!id) return Promise.resolve(false);
  try {
    assertCloudinaryConfigured();
  } catch {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    cloudinary.uploader.destroy(id, { resource_type: "image" }, (err, result) => {
      if (err) {
        console.warn("cloudinary.destroy", id, err.message || err);
        resolve(false);
        return;
      }
      resolve(result?.result === "ok");
    });
  });
}

module.exports = {
  uploadImageBufferToCloudinary,
  destroyCloudinaryByPublicId,
};
