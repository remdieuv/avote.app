/**
 * Application PATCH options — coerce body, replace, relecture obligatoire.
 */

const {
  pollPatchRequestsOptionsChange,
  validatePollOptionLabels,
} = require("./pollPatchGuards");
const { replacePollOptions } = require("./replacePollOptions");

/**
 * @param {unknown} raw
 * @returns {unknown[] | null}
 */
function coerceOptionsArray(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * @param {Record<string, unknown> | null | undefined} body
 * @param {string | null | undefined} pollType
 * @returns {{
 *   requested: boolean;
 *   invalidShape: boolean;
 *   options: unknown[] | null;
 * }}
 */
function resolvePatchOptionsRequest(body, pollType) {
  const b = body && typeof body === "object" ? body : {};
  const hasKey = Object.prototype.hasOwnProperty.call(b, "options");
  if (!hasKey) {
    return { requested: false, invalidShape: false, options: null };
  }
  // CONTEST : clé options ignorée (fixe Oui/Non) — pas une erreur de forme.
  if (String(pollType || "").toUpperCase() === "CONTEST_ENTRY") {
    return { requested: false, invalidShape: false, options: null };
  }
  const coerced = coerceOptionsArray(b.options);
  if (!coerced) {
    return { requested: true, invalidShape: true, options: null };
  }
  return {
    requested: pollPatchRequestsOptionsChange({ options: coerced }, pollType),
    invalidShape: false,
    options: coerced,
  };
}

/**
 * Remplace les options puis relit en base (hors TX) pour garantir la persistance.
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {{
 *   pollId: string;
 *   labelsRaw: unknown[];
 *   isQuiz?: boolean;
 *   quizCorrectOrder?: number | null;
 *   leadEnabled?: boolean;
 *   leadTriggerOrder?: number;
 * }} input
 * @returns {Promise<{
 *   ok: boolean;
 *   status: number;
 *   error: string | null;
 *   labels: string[];
 *   options: { id: string; label: string; order: number; isCorrect: boolean }[];
 * }>}
 */
async function applyPollOptionsPatch(prisma, input) {
  const validated = validatePollOptionLabels(input.labelsRaw);
  if (!validated.ok) {
    return {
      ok: false,
      status: 400,
      error: validated.error,
      labels: validated.labels,
      options: [],
    };
  }
  const labels = validated.labels;

  await prisma.$transaction(async (tx) =>
    replacePollOptions(tx, {
      pollId: input.pollId,
      labels,
      isQuiz: Boolean(input.isQuiz),
      quizCorrectOrder: input.quizCorrectOrder,
      leadEnabled: Boolean(input.leadEnabled),
      leadTriggerOrder: input.leadTriggerOrder,
    }),
  );

  // Relecture indépendante de la TX — détecte tout rollback / décalage.
  const persisted = await prisma.pollOption.findMany({
    where: { pollId: input.pollId },
    orderBy: { order: "asc" },
    select: { id: true, label: true, order: true, isCorrect: true },
  });

  if (persisted.length !== labels.length) {
    return {
      ok: false,
      status: 500,
      error: `Échec de persistance des réponses : ${persisted.length} en base, ${labels.length} attendues.`,
      labels,
      options: persisted,
    };
  }
  for (let i = 0; i < labels.length; i += 1) {
    if (String(persisted[i]?.label || "") !== labels[i]) {
      return {
        ok: false,
        status: 500,
        error: `Échec de persistance des réponses : libellé ${i + 1} incorrect.`,
        labels,
        options: persisted,
      };
    }
  }

  return {
    ok: true,
    status: 200,
    error: null,
    labels,
    options: persisted,
  };
}

module.exports = {
  coerceOptionsArray,
  resolvePatchOptionsRequest,
  applyPollOptionsPatch,
};
