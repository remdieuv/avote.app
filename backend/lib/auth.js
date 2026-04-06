const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SALT_ROUNDS = 11;
const TOKEN_COOKIE = "avote_token";
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "JWT_SECRET manquant ou trop court (min. 16 caractères). Définissez-le dans .env",
    );
  }
  return s;
}

/**
 * @param {string} password
 * @returns {Promise<string>}
 */
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * @param {string} password
 * @param {string} hash
 */
async function verifyPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

/**
 * @param {string} userId
 * @param {string} email
 */
function signToken(userId, email) {
  return jwt.sign(
    { sub: userId, email },
    getJwtSecret(),
    { expiresIn: "7d" },
  );
}

/**
 * @param {string | undefined} token
 * @returns {{ sub: string; email: string } | null}
 */
function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const p = jwt.verify(token, getJwtSecret());
    const sub = typeof p.sub === "string" ? p.sub : null;
    const email = typeof p.email === "string" ? p.email : null;
    if (!sub || !email) return null;
    return { sub, email };
  } catch {
    return null;
  }
}

/**
 * @param {import("express").Request} req
 * @returns {string | null}
 */
function readTokenFromRequest(req) {
  const fromCookie =
    req.cookies && typeof req.cookies[TOKEN_COOKIE] === "string"
      ? req.cookies[TOKEN_COOKIE]
      : null;
  if (fromCookie) return fromCookie;
  const h = req.headers.authorization;
  if (h && typeof h === "string" && h.startsWith("Bearer ")) {
    return h.slice(7).trim();
  }
  return null;
}

/**
 * @param {import("express").Response} res
 * @param {string} token
 */
function setAuthCookie(res, token) {
  const secure = process.env.NODE_ENV === "production";
  res.cookie(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_MAX_AGE_MS,
  });
}

/** @param {import("express").Response} res */
function clearAuthCookie(res) {
  const secure = process.env.NODE_ENV === "production";
  res.clearCookie(TOKEN_COOKIE, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
  });
}

module.exports = {
  TOKEN_COOKIE,
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  readTokenFromRequest,
  setAuthCookie,
  clearAuthCookie,
};
