/** Durée max du chrono scène (doit rester alignée avec l’API). */
export const QUESTION_TIMER_MAX_SEC = 90 * 24 * 60 * 60;

/**
 * Compte à rebours lisible (régie, projection).
 * Ex. 90 j → "90 j 00:00:00", 3 h → "3:00:00", 2 min → "02:00"
 * @param {number | null | undefined} secondes
 */
export function formatCountdownVerbose(secondes) {
  const n = Math.max(0, Math.floor(secondes ?? 0));
  const d = Math.floor(n / 86400);
  const h = Math.floor((n % 86400) / 3600);
  const m = Math.floor((n % 3600) / 60);
  const s = n % 60;
  const pad2 = (x) => String(x).padStart(2, "0");
  if (d > 0) return `${d} j ${pad2(h)}:${pad2(m)}:${pad2(s)}`;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`;
  return `${pad2(m)}:${pad2(s)}`;
}

/**
 * @param {number | null | undefined} sec
 */
export function decomposeTimerSeconds(sec) {
  const n = Math.max(0, Math.floor(sec ?? 0));
  return {
    days: Math.floor(n / 86400),
    hours: Math.floor((n % 86400) / 3600),
    minutes: Math.floor((n % 3600) / 60),
    seconds: n % 60,
  };
}
