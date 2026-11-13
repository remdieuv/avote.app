/**
 * Réinitialisation mot de passe — jetons hashés, usage unique.
 */

const crypto = require("crypto");
const { prisma } = require("./prisma");
const { hashPassword } = require("./auth");
const {
  buildPasswordResetEmail,
  sendMail,
  resolveMailTransportMode,
} = require("./mail");

const RESET_TTL_MS = 60 * 60 * 1000; // 1 h
const RESET_TTL_MINUTES = 60;
const GENERIC_OK_MESSAGE =
  "Si un compte existe pour cet e-mail, un lien de réinitialisation a été envoyé.";

/**
 * @param {string} raw
 * @returns {string}
 */
function hashResetToken(raw) {
  return crypto.createHash("sha256").update(String(raw), "utf8").digest("hex");
}

/**
 * @returns {string} jeton brut (à envoyer par e-mail uniquement)
 */
function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Origine front pour les liens (CLIENT_URL).
 * @returns {string}
 */
function clientOrigin() {
  const raw = String(process.env.CLIENT_URL || "").trim().replace(/\/$/, "");
  if (raw) return raw;
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  return "";
}

/**
 * Demande de reset — réponse toujours générique (pas d’énumération de comptes).
 * @param {string} emailRaw
 * @returns {Promise<{ ok: true; message: string; mailMode?: string; previewUrl?: string; debugToken?: string }>}
 */
async function requestPasswordReset(emailRaw) {
  const email = String(emailRaw || "")
    .trim()
    .toLowerCase();
  const message = GENERIC_OK_MESSAGE;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    // Même message pour ne pas distinguer format vs existence
    return { ok: true, message };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      provider: true,
    },
  });

  // Pas de compte, Google-only, ou sans hash → silence
  if (!user || !user.passwordHash) {
    return { ok: true, message };
  }

  const rawToken = generateResetToken();
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  const origin = clientOrigin();
  if (!origin) {
    console.error("[password-reset] CLIENT_URL manquant — e-mail non envoyé.");
    return { ok: true, message };
  }

  const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const mailPayload = buildPasswordResetEmail({
    email: user.email,
    resetUrl,
    expiresMinutes: RESET_TTL_MINUTES,
  });
  const sent = await sendMail(mailPayload);

  if (!sent.ok) {
    console.error("[password-reset] échec envoi:", sent.error);
  }

  /** @type {{ ok: true; message: string; mailMode?: string; previewUrl?: string; debugToken?: string }} */
  const out = { ok: true, message, mailMode: sent.mode };
  if (sent.previewUrl) out.previewUrl = sent.previewUrl;
  // Uniquement hors prod + MAIL_DEBUG_TOKEN=1 (tests locaux)
  if (
    process.env.NODE_ENV !== "production" &&
    String(process.env.MAIL_DEBUG_TOKEN || "").trim() === "1"
  ) {
    out.debugToken = rawToken;
  }
  return out;
}

/**
 * @param {string} rawToken
 * @param {string} newPassword
 * @returns {Promise<{ ok: boolean; error?: string; status?: number }>}
 */
async function resetPasswordWithToken(rawToken, newPassword) {
  const token = String(rawToken || "").trim();
  const pass = String(newPassword || "");
  if (!token) {
    return { ok: false, status: 400, error: "Lien invalide ou expiré." };
  }
  if (pass.length < 8) {
    return {
      ok: false,
      status: 400,
      error: "Mot de passe : au moins 8 caractères.",
    };
  }

  const tokenHash = hashResetToken(token);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (!row || row.usedAt || row.expiresAt.getTime() <= Date.now()) {
    return { ok: false, status: 400, error: "Lien invalide ou expiré." };
  }

  const passwordHash = await hashPassword(pass);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
    // Invalide les autres jetons encore ouverts
    prisma.passwordResetToken.updateMany({
      where: { userId: row.userId, usedAt: null, id: { not: row.id } },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true };
}

module.exports = {
  RESET_TTL_MS,
  RESET_TTL_MINUTES,
  GENERIC_OK_MESSAGE,
  hashResetToken,
  generateResetToken,
  clientOrigin,
  requestPasswordReset,
  resetPasswordWithToken,
  resolveMailTransportMode,
};
