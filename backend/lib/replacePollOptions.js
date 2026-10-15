/**
 * Remplace les options d’un sondage (uniquement si 0 vote — appelé après guards).
 * Utilise create (pas createMany) + relecture pour garantir la persistance.
 */

/**
 * @param {import("@prisma/client").PrismaClient | import("@prisma/client").Prisma.TransactionClient} db
 * @param {{
 *   pollId: string;
 *   labels: string[];
 *   isQuiz?: boolean;
 *   quizCorrectOrder?: number | null;
 *   leadEnabled?: boolean;
 *   leadTriggerOrder?: number;
 * }} input
 * @returns {Promise<{ id: string; label: string; order: number; isCorrect: boolean }[]>}
 */
async function replacePollOptions(db, input) {
  const pollId = String(input.pollId || "");
  const labels = Array.isArray(input.labels) ? input.labels : [];
  if (!pollId || labels.length < 2) {
    throw new Error("replacePollOptions: pollId et ≥2 labels requis.");
  }
  const isQuiz = Boolean(input.isQuiz);
  const quizCorrectOrder =
    input.quizCorrectOrder == null ? null : Number(input.quizCorrectOrder);
  const leadEnabled = Boolean(input.leadEnabled);
  const leadTriggerOrder = Math.max(
    0,
    Math.min(
      labels.length - 1,
      Math.floor(Number(input.leadTriggerOrder) || 0),
    ),
  );

  await db.poll.update({
    where: { id: pollId },
    data: { leadTriggerOptionId: null },
  });
  await db.pollOption.deleteMany({ where: { pollId } });

  const created = [];
  for (let order = 0; order < labels.length; order += 1) {
    const row = await db.pollOption.create({
      data: {
        pollId,
        label: labels[order],
        order,
        isCorrect: isQuiz ? order === quizCorrectOrder : false,
      },
      select: { id: true, label: true, order: true, isCorrect: true },
    });
    created.push(row);
  }

  if (created.length !== labels.length) {
    throw new Error(
      `replacePollOptions: ${created.length} créées, ${labels.length} attendues.`,
    );
  }

  if (leadEnabled) {
    const trigger = created[leadTriggerOrder] ?? created[0] ?? null;
    await db.poll.update({
      where: { id: pollId },
      data: { leadTriggerOptionId: trigger?.id ?? null },
    });
  }

  return created;
}

module.exports = {
  replacePollOptions,
};
