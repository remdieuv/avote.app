/**
 * Envoi d’e-mails transactionnels (reset mot de passe).
 * Transports :
 * - SMTP_URL (nodemailer)
 * - RESEND_API_KEY (API HTTPS Resend)
 * - sinon mode log (dev / tests) si MAIL_ALLOW_LOG=1 ou NODE_ENV≠production
 */

const nodemailer = require("nodemailer");

/**
 * @returns {{ mode: "smtp"|"resend"|"log"|"disabled"; detail?: string }}
 */
function resolveMailTransportMode() {
  const smtp = String(process.env.SMTP_URL || "").trim();
  if (smtp) return { mode: "smtp" };
  const resend = String(process.env.RESEND_API_KEY || "").trim();
  if (resend) return { mode: "resend" };
  const allowLog =
    String(process.env.MAIL_ALLOW_LOG || "").trim() === "1" ||
    process.env.NODE_ENV !== "production";
  if (allowLog) return { mode: "log" };
  return {
    mode: "disabled",
    detail: "Aucun transport e-mail configuré (SMTP_URL ou RESEND_API_KEY).",
  };
}

function defaultFromAddress() {
  const from = String(process.env.MAIL_FROM || "").trim();
  return from || "AVOTE <noreply@avote.app>";
}

/**
 * @param {{ to: string; subject: string; text: string; html?: string }} msg
 * @returns {Promise<{ ok: boolean; mode: string; messageId?: string; previewUrl?: string; error?: string }>}
 */
async function sendMail(msg) {
  const to = String(msg?.to || "").trim();
  const subject = String(msg?.subject || "").trim();
  const text = String(msg?.text || "");
  const html = typeof msg?.html === "string" ? msg.html : undefined;
  if (!to || !subject) {
    return { ok: false, mode: "disabled", error: "Destinataire ou sujet manquant." };
  }

  const transport = resolveMailTransportMode();
  const from = defaultFromAddress();

  if (transport.mode === "disabled") {
    console.error("[mail] envoi impossible:", transport.detail);
    return { ok: false, mode: "disabled", error: transport.detail };
  }

  if (transport.mode === "log") {
    const line = `[mail:log] to=${to} subject=${subject}\n${text}`;
    console.info(line);
    return { ok: true, mode: "log", messageId: `log-${Date.now()}` };
  }

  if (transport.mode === "resend") {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${String(process.env.RESEND_API_KEY).trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          text,
          html: html || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err =
          (typeof body?.message === "string" && body.message) ||
          `Resend HTTP ${res.status}`;
        console.error("[mail:resend]", err);
        return { ok: false, mode: "resend", error: err };
      }
      return {
        ok: true,
        mode: "resend",
        messageId: typeof body?.id === "string" ? body.id : undefined,
      };
    } catch (e) {
      console.error("[mail:resend]", e);
      return {
        ok: false,
        mode: "resend",
        error: e?.message || "Échec Resend.",
      };
    }
  }

  // SMTP
  try {
    const transporter = nodemailer.createTransport(String(process.env.SMTP_URL).trim());
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html: html || undefined,
    });
    const previewUrl =
      typeof nodemailer.getTestMessageUrl === "function"
        ? nodemailer.getTestMessageUrl(info) || undefined
        : undefined;
    return {
      ok: true,
      mode: "smtp",
      messageId: info?.messageId ? String(info.messageId) : undefined,
      previewUrl: previewUrl || undefined,
    };
  } catch (e) {
    console.error("[mail:smtp]", e);
    return {
      ok: false,
      mode: "smtp",
      error: e?.message || "Échec SMTP.",
    };
  }
}

/**
 * @param {{ email: string; resetUrl: string; expiresMinutes: number }} opts
 */
function buildPasswordResetEmail(opts) {
  const email = String(opts.email || "").trim();
  const resetUrl = String(opts.resetUrl || "").trim();
  const minutes = Math.max(1, Number(opts.expiresMinutes) || 60);
  const subject = "Réinitialisation de votre mot de passe AVOTE";
  const text = [
    "Bonjour,",
    "",
    "Vous avez demandé à réinitialiser le mot de passe de votre compte AVOTE.",
    `Ce lien est valable ${minutes} minute(s) et ne peut être utilisé qu’une seule fois :`,
    resetUrl,
    "",
    "Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.",
    "",
    "— L’équipe AVOTE",
  ].join("\n");
  const html = `<p>Bonjour,</p>
<p>Vous avez demandé à réinitialiser le mot de passe de votre compte AVOTE.</p>
<p><a href="${resetUrl.replace(/"/g, "&quot;")}">Réinitialiser mon mot de passe</a></p>
<p style="color:#64748b;font-size:14px">Lien valable ${minutes}&nbsp;minute(s), usage unique.<br/>
Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.</p>
<p>— L’équipe AVOTE</p>`;
  return { to: email, subject, text, html };
}

module.exports = {
  resolveMailTransportMode,
  sendMail,
  buildPasswordResetEmail,
  defaultFromAddress,
};
