const { prisma } = require("./prisma");

/**
 * @param {string} eventId
 * @param {string} userId
 * @returns {Promise<{ ok: true } | { ok: false; status: number }>}
 */
async function assertEventOwnedBy(eventId, userId) {
  const id = String(eventId || "").trim();
  const uid = String(userId || "").trim();
  if (!id || !uid) return { ok: false, status: 400 };
  const ev = await prisma.event.findFirst({
    where: { id, userId: uid },
    select: { id: true },
  });
  if (ev) return { ok: true };
  const exists = await prisma.event.findUnique({
    where: { id },
    select: { id: true },
  });
  return { ok: false, status: exists ? 403 : 404 };
}

/**
 * Propriétaire de l’événement ou compte plateforme ADMIN (support / régie globale).
 * @param {string} eventId
 * @param {string} userId
 * @returns {Promise<{ ok: true } | { ok: false; status: number }>}
 */
async function assertEventOwnedByOrPlatformAdmin(eventId, userId) {
  const owned = await assertEventOwnedBy(eventId, userId);
  if (owned.ok) return owned;
  const id = String(eventId || "").trim();
  const uid = String(userId || "").trim();
  if (!id || !uid) return owned;
  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { role: true },
  });
  if (String(user?.role || "").toUpperCase() !== "ADMIN") {
    return owned;
  }
  const ev = await prisma.event.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!ev) return { ok: false, status: 404 };
  return { ok: true };
}

/**
 * @param {string} pollId
 * @param {string} userId
 */
async function assertPollOwnedBy(pollId, userId) {
  const id = String(pollId || "").trim();
  const uid = String(userId || "").trim();
  if (!id || !uid) return { ok: false, status: 400 };
  const poll = await prisma.poll.findFirst({
    where: { id, event: { userId: uid } },
    select: { id: true },
  });
  if (poll) return { ok: true };
  const exists = await prisma.poll.findUnique({
    where: { id },
    select: { id: true },
  });
  return { ok: false, status: exists ? 403 : 404 };
}

module.exports = {
  assertEventOwnedBy,
  assertEventOwnedByOrPlatformAdmin,
  assertPollOwnedBy,
};
