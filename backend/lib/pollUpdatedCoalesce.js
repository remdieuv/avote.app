/**
 * Coalesce des émissions `poll_updated` pendant un burst de votes.
 * Les chemins critiques doivent appeler flushNow (ou emit immédiat après cancel).
 */

/**
 * @param {{
 *   emit: (pollId: string) => void | Promise<void>;
 *   delayMs?: number;
 * }} opts
 */
function createPollUpdatedCoalescer(opts) {
  const delayMs = Math.max(50, Math.min(1000, Number(opts.delayMs) || 150));
  const emit = opts.emit;
  /** @type {Map<string, ReturnType<typeof setTimeout>>} */
  const timers = new Map();
  /** @type {Set<string>} */
  const flushing = new Set();

  /**
   * @param {string} pollId
   */
  function cancel(pollId) {
    const id = String(pollId || "").trim();
    if (!id) return;
    const t = timers.get(id);
    if (t) {
      clearTimeout(t);
      timers.delete(id);
    }
  }

  /**
   * Planifie un emit (debounce). Plusieurs votes → un seul flush.
   * @param {string} pollId
   */
  function schedule(pollId) {
    const id = String(pollId || "").trim();
    if (!id || typeof emit !== "function") return;
    cancel(id);
    const t = setTimeout(() => {
      timers.delete(id);
      void flushNow(id);
    }, delayMs);
    timers.set(id, t);
  }

  /**
   * Annule le timer et émet immédiatement (état à recharger côté emit).
   * @param {string} pollId
   */
  async function flushNow(pollId) {
    const id = String(pollId || "").trim();
    if (!id || typeof emit !== "function") return;
    cancel(id);
    if (flushing.has(id)) return;
    flushing.add(id);
    try {
      await emit(id);
    } finally {
      flushing.delete(id);
    }
  }

  /**
   * True si un emit est encore en attente pour ce poll.
   * @param {string} pollId
   */
  function hasPending(pollId) {
    return timers.has(String(pollId || "").trim());
  }

  return {
    schedule,
    flushNow,
    cancel,
    hasPending,
    delayMs,
  };
}

module.exports = {
  createPollUpdatedCoalescer,
};
