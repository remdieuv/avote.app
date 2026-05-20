/**
 * Solde affichable : activations typées (FUN/EVENT) + reliquat eventCredits.
 * @param {number | null | undefined} eventCredits
 * @param {{ FUN?: number; EVENT?: number } | null | undefined} activationsAvailable
 */
export function computeActivationBalance(eventCredits, activationsAvailable) {
  const credits =
    typeof eventCredits === "number" && Number.isFinite(eventCredits)
      ? Math.max(0, Math.trunc(eventCredits))
      : null;

  const avail =
    activationsAvailable && typeof activationsAvailable === "object"
      ? activationsAvailable
      : null;
  const fun =
    avail && Number.isFinite(Number(avail.FUN))
      ? Math.max(0, Math.trunc(Number(avail.FUN)))
      : null;
  const event =
    avail && Number.isFinite(Number(avail.EVENT))
      ? Math.max(0, Math.trunc(Number(avail.EVENT)))
      : null;

  const typedLoaded = fun !== null && event !== null;
  const typedTotal = typedLoaded ? fun + event : 0;
  const legacyCredits =
    credits !== null && typedLoaded ? Math.max(0, credits - typedTotal) : 0;
  const totalAvailable =
    credits !== null
      ? typedLoaded
        ? typedTotal + legacyCredits
        : credits
      : typedLoaded
        ? typedTotal
        : null;

  return {
    fun,
    event,
    typedTotal,
    legacyCredits,
    totalAvailable,
    typedLoaded,
    credits,
  };
}

/** @param {number} count */
export function formatDisponibles(count) {
  const n = Math.max(0, Math.trunc(count));
  return n === 1 ? "1 disponible" : `${n} disponibles`;
}
