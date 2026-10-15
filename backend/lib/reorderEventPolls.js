/**
 * Persiste un nouvel ordre de playlist (orders contigus 0..n-1).
 * Ne touche jamais à activePollId.
 */

const {
  buildContiguousOrderUpdates,
  validateFullPollOrder,
} = require("./playlistPollGuards");

/**
 * @param {import("@prisma/client").PrismaClient | import("@prisma/client").Prisma.TransactionClient} prisma
 * @param {{
 *   eventId: string;
 *   pollIdsOrdered: string[];
 * }} input
 * @returns {Promise<{
 *   ok: boolean;
 *   status: number;
 *   error: string | null;
 *   polls: { id: string; order: number }[];
 * }>}
 */
async function applyEventPollsReorder(prisma, input) {
  const eventId = String(input.eventId || "").trim();
  if (!eventId) {
    return {
      ok: false,
      status: 400,
      error: "eventId requis.",
      polls: [],
    };
  }

  const existing = await prisma.poll.findMany({
    where: { eventId },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });
  const currentIds = existing.map((p) => p.id);
  const validated = validateFullPollOrder(currentIds, input.pollIdsOrdered);
  if (!validated.ok) {
    return {
      ok: false,
      status: 400,
      error: validated.error,
      polls: existing,
    };
  }

  const updates = buildContiguousOrderUpdates(validated.pollIds);
  const unchanged =
    updates.length === existing.length &&
    updates.every((u, i) => u.id === existing[i].id && u.order === existing[i].order);
  if (unchanged) {
    return { ok: true, status: 200, error: null, polls: existing };
  }

  // Deux passes pour éviter les collisions d’unicité implicite sur (eventId, order)
  // si un index unique existait / pour rester sûr avec des orders temporaires.
  const tempBase = existing.length + 1000;
  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < updates.length; i++) {
      await tx.poll.update({
        where: { id: updates[i].id },
        data: { order: tempBase + i },
      });
    }
    for (const u of updates) {
      await tx.poll.update({
        where: { id: u.id },
        data: { order: u.order },
      });
    }
  });

  const polls = await prisma.poll.findMany({
    where: { eventId },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });

  return { ok: true, status: 200, error: null, polls };
}

module.exports = {
  applyEventPollsReorder,
};
