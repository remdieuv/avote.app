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

module.exports = { assertEventOwnedBy, assertPollOwnedBy };
