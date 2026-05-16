/** Seuil au-delà duquel on compresse avant upload (marge sous la limite multer). */
export const LANDING_PHOTO_COMPRESS_THRESHOLD_BYTES = Math.floor(2.5 * 1024 * 1024);

export const LANDING_PHOTO_MAX_WIDTH = 1920;

/** Qualité JPEG (plage produit 0,75–0,82). */
export const LANDING_PHOTO_JPEG_QUALITY = 0.8;

/** Doit rester sous la limite multer backend après compression. */
export const LANDING_PHOTO_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const LANDING_PHOTO_TOO_HEAVY_MESSAGE =
  "Photo trop lourde. Essayez une capture ou une image plus légère.";

const ALLOWED_UPLOAD_MIME = /^image\/(jpeg|png|gif|webp)$/i;
const HEIC_MIME = /^image\/(heic|heif)$/i;

function isLikelyImage(file) {
  if (!file || typeof file !== "object") return false;
  if (typeof file.type === "string" && file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(String(file.name || ""));
}

function fileBaseName(name) {
  const base = String(name || "photo")
    .replace(/\.[^.]+$/, "")
    .trim();
  return (base || "photo").slice(0, 80);
}

function canvasToJpegBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("blob"));
      },
      "image/jpeg",
      quality,
    );
  });
}

async function decodeImageFile(file) {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw(ctx, dw, dh) {
          ctx.drawImage(bitmap, 0, 0, dw, dh);
        },
        dispose() {
          bitmap.close?.();
        },
      };
    } catch {
      /* fallback Image */
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode"));
      el.src = url;
    });
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      draw(ctx, dw, dh) {
        ctx.drawImage(img, 0, 0, dw, dh);
      },
      dispose() {},
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Prépare une photo pour POST /events/:id/landing/photos (compression si besoin).
 * @param {File} file
 * @param {{ onOptimizing?: () => void }} [options]
 * @returns {Promise<File>}
 */
export async function prepareLandingPhotoForUpload(file, options = {}) {
  if (typeof window === "undefined") {
    return file;
  }
  if (!isLikelyImage(file)) {
    throw new Error(LANDING_PHOTO_TOO_HEAVY_MESSAGE);
  }

  const needsMimeFix =
    HEIC_MIME.test(file.type || "") || !ALLOWED_UPLOAD_MIME.test(file.type || "");
  const overThreshold = file.size > LANDING_PHOTO_COMPRESS_THRESHOLD_BYTES;

  let decoded;
  try {
    decoded = await decodeImageFile(file);
  } catch {
    throw new Error(LANDING_PHOTO_TOO_HEAVY_MESSAGE);
  }

  const scale =
    decoded.width > LANDING_PHOTO_MAX_WIDTH
      ? LANDING_PHOTO_MAX_WIDTH / decoded.width
      : 1;
  const targetW = Math.max(1, Math.round(decoded.width * scale));
  const targetH = Math.max(1, Math.round(decoded.height * scale));
  const needsResize = scale < 1;

  if (
    !needsMimeFix &&
    !overThreshold &&
    !needsResize &&
    ALLOWED_UPLOAD_MIME.test(file.type || "")
  ) {
    decoded.dispose();
    return file;
  }

  options.onOptimizing?.();

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    decoded.dispose();
    throw new Error(LANDING_PHOTO_TOO_HEAVY_MESSAGE);
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetW, targetH);
  decoded.draw(ctx, targetW, targetH);
  decoded.dispose();

  let quality = LANDING_PHOTO_JPEG_QUALITY;
  let blob = await canvasToJpegBlob(canvas, quality);
  while (blob.size > LANDING_PHOTO_MAX_UPLOAD_BYTES && quality > 0.52) {
    quality = Math.max(0.52, quality - 0.08);
    blob = await canvasToJpegBlob(canvas, quality);
  }

  if (blob.size > LANDING_PHOTO_MAX_UPLOAD_BYTES) {
    throw new Error(LANDING_PHOTO_TOO_HEAVY_MESSAGE);
  }

  return new File([blob], `${fileBaseName(file.name)}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}
