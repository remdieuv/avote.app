/**
 * Tests reset mot de passe + envoi e-mail réel via Ethereal (SMTP).
 * Exécution : node scripts/test-password-reset-mail.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nodemailer = require("nodemailer");
const {
  buildPasswordResetEmail,
  sendMail,
  resolveMailTransportMode,
} = require("../lib/mail");
const {
  hashResetToken,
  generateResetToken,
  GENERIC_OK_MESSAGE,
  clientOrigin,
} = require("../lib/passwordReset");
const { isDisallowedDemoQuestionText } = require("../lib/demoQuestionGuard");

let failed = 0;

/** @param {string} name @param {() => void | Promise<void>} fn */
async function test(name, fn) {
  try {
    await fn();
    console.log(`ok — ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`FAIL — ${name}`);
    console.error(e);
  }
}

async function main() {
  await test("jeton reset hashé SHA-256 déterministe", () => {
    const a = generateResetToken();
    assert.equal(a.length, 64);
    assert.equal(hashResetToken(a), hashResetToken(a));
    assert.notEqual(hashResetToken(a), hashResetToken(a + "x"));
  });

  await test("message générique anti-énumération", () => {
    assert.match(GENERIC_OK_MESSAGE, /Si un compte existe/i);
  });

  await test("payload e-mail reset", () => {
    const m = buildPasswordResetEmail({
      email: "a@b.test",
      resetUrl: "https://www.avote.app/reset-password?token=abc",
      expiresMinutes: 60,
    });
    assert.equal(m.to, "a@b.test");
    assert.match(m.subject, /mot de passe/i);
    assert.match(m.text, /reset-password\?token=abc/);
    assert.match(m.html, /Réinitialiser/);
  });

  await test("mode log hors prod sans SMTP", async () => {
    const prevSmtp = process.env.SMTP_URL;
    const prevResend = process.env.RESEND_API_KEY;
    const prevNode = process.env.NODE_ENV;
    const prevLog = process.env.MAIL_ALLOW_LOG;
    delete process.env.SMTP_URL;
    delete process.env.RESEND_API_KEY;
    process.env.NODE_ENV = "test";
    process.env.MAIL_ALLOW_LOG = "1";
    assert.equal(resolveMailTransportMode().mode, "log");
    const sent = await sendMail(
      buildPasswordResetEmail({
        email: "log@test.local",
        resetUrl: "http://localhost:3000/reset-password?token=t",
        expiresMinutes: 60,
      }),
    );
    assert.equal(sent.ok, true);
    assert.equal(sent.mode, "log");
    if (prevSmtp === undefined) delete process.env.SMTP_URL;
    else process.env.SMTP_URL = prevSmtp;
    if (prevResend === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevResend;
    process.env.NODE_ENV = prevNode;
    if (prevLog === undefined) delete process.env.MAIL_ALLOW_LOG;
    else process.env.MAIL_ALLOW_LOG = prevLog;
  });

  await test("envoi SMTP réel via Ethereal", async () => {
    const account = await nodemailer.createTestAccount();
    assert.ok(account.user);
    // Ethereal : souvent port 587 STARTTLS → smtp:// (pas smtps://)
    const scheme = account.smtp.secure ? "smtps" : "smtp";
    const smtpUrl = `${scheme}://${encodeURIComponent(account.user)}:${encodeURIComponent(account.pass)}@${account.smtp.host}:${account.smtp.port}`;
    const prevSmtp = process.env.SMTP_URL;
    const prevResend = process.env.RESEND_API_KEY;
    process.env.SMTP_URL = smtpUrl;
    delete process.env.RESEND_API_KEY;
    assert.equal(resolveMailTransportMode().mode, "smtp");

    const payload = buildPasswordResetEmail({
      email: account.user,
      resetUrl: "https://www.avote.app/reset-password?token=ethereal-demo",
      expiresMinutes: 60,
    });
    const sent = await sendMail(payload);
    assert.equal(sent.ok, true, sent.error || "send failed");
    assert.equal(sent.mode, "smtp");
    assert.ok(sent.messageId);
    const preview =
      sent.previewUrl ||
      (typeof nodemailer.getTestMessageUrl === "function"
        ? nodemailer.getTestMessageUrl({ messageId: sent.messageId })
        : null);
    if (preview) console.log("  ethereal preview:", preview);
    else console.log("  ethereal messageId:", sent.messageId);

    if (prevSmtp === undefined) delete process.env.SMTP_URL;
    else process.env.SMTP_URL = prevSmtp;
    if (prevResend === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevResend;
  });

  await test("clientOrigin fallback local", () => {
    const prev = process.env.CLIENT_URL;
    const prevNode = process.env.NODE_ENV;
    delete process.env.CLIENT_URL;
    process.env.NODE_ENV = "development";
    assert.equal(clientOrigin(), "http://localhost:3000");
    process.env.CLIENT_URL = "https://www.avote.app/";
    assert.equal(clientOrigin(), "https://www.avote.app");
    if (prev === undefined) delete process.env.CLIENT_URL;
    else process.env.CLIENT_URL = prev;
    process.env.NODE_ENV = prevNode;
  });

  await test("garde-fou Placeholder question", () => {
    assert.equal(isDisallowedDemoQuestionText("Placeholder question"), true);
    assert.equal(isDisallowedDemoQuestionText("  PLACEHOLDER QUESTION  "), true);
    assert.equal(isDisallowedDemoQuestionText("Lot6 capitale France ?"), false);
  });

  if (failed > 0) {
    console.error(`\n${failed} test(s) en échec`);
    process.exit(1);
  }
  console.log("\nTous les tests password-reset-mail OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
