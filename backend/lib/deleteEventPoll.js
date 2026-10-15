/**
 * Suppression d’une question + renumérotation contiguë des `order`.
 * Ne touche jamais à activePollId (bloqué en amont si antenne).
 */

/**
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {{
 *   eventId: string;
 *   pollId: string;
 * }} input
 * @returns {Promise<{
 *   ok: boolean;
 *   status: number;
 *   error: string | null;
 *   deletedPollId: string | null;
 *   polls: { id: string; order: number }[];
 * }>}
 */
async function applyEventPollDelete(prisma, input) {
  const eventId = String(input.eventId || "").trim();
  const pollId = String(input.pollId || "").trim();
  if (!eventId || !pollId) {
    return {
      ok: false,
      status: 400,
      error: "eventId et pollId requis.",
      deletedPollId: null,
      polls: [],
    };
  }

  const existing = await prisma.poll.findMany({
    where: { eventId },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });
  if (!existing.some((p) => p.id === pollId)) {
    return {
      ok: false,
      status: 404,
      error: "Sondage introuvable.",
      deletedPollId: null,
      polls: existing,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.poll.delete({ where: { id: pollId } });
    const remaining = await tx.poll.findMany({
      where: { eventId },
      orderBy: { order: "asc" },
      select: { id: true },
    });
    const tempBase = remaining.length + 1000;
    for (let i = 0; i < remaining.length; i++) {
      await tx.poll.update({
        where: { id: remaining[i].id },
        data: { order: tempBase + i },
      });
    }
    for (let i = 0; i < remaining.length; i++) {
      await tx.poll.update({
        where: { id: remaining[i].id },
        data: { order: i },
      });
    }
  });

  const polls = await prisma.poll.findMany({
    where: { eventId },
    orderBy: { order: "asc" },
    select: { id: true, order: true },
  });

  return {
    ok: true,
    status: 200,
    error: null,
    deletedPollId: pollId,
    polls,
  };
}

module.exports = {
  applyEventPollDelete,
};
