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

/**
 * Chrono « armé / actif » côté régie = snapshot API présent
 * (`questionTimerTotalSec != null` → `questionTimer` non null).
 * Pas d’état UI indépendant.
 * @param {{ totalSec?: number | null } | null | undefined} questionTimer
 */
export function isRegieChronoEnabled(questionTimer) {
  return (
    questionTimer != null &&
    typeof questionTimer === "object" &&
    typeof questionTimer.totalSec === "number" &&
    Number.isFinite(questionTimer.totalSec)
  );
}

/**
 * Libellé d’état principal du chrono régie (pilotage + barre haute).
 * @param {{ totalSec?: number | null; running?: boolean; isPaused?: boolean } | null | undefined} questionTimer
 * @returns {"Inactif" | "Actif"}
 */
export function getRegieChronoEnabledLabel(questionTimer) {
  return isRegieChronoEnabled(questionTimer) ? "Actif" : "Inactif";
}

/**
 * Mode de pilotage dérivé uniquement du snapshot serveur (pas de 2e état UI).
 * - inactive : pas de durée armée
 * - stopped : armé, à l’arrêt (jamais démarré / remis à zéro)
 * - running : compte à rebours en cours
 * - paused : en pause après avoir consommé du temps
 *
 * @param {{
 *   totalSec?: number | null;
 *   remainingSec?: number | null;
 *   accumulatedSec?: number | null;
 *   running?: boolean;
 *   isPaused?: boolean;
 * } | null | undefined} questionTimer
 * @returns {"inactive" | "stopped" | "running" | "paused"}
 */
export function getRegieChronoControlMode(questionTimer) {
  if (!isRegieChronoEnabled(questionTimer)) return "inactive";
  if (questionTimer?.running && !questionTimer?.isPaused) return "running";
  const total = Number(questionTimer?.totalSec) || 0;
  const remaining = Number(questionTimer?.remainingSec);
  const accumulated = Number(questionTimer?.accumulatedSec) || 0;
  const consumed =
    accumulated > 0 ||
    (Number.isFinite(remaining) && total > 0 && remaining < total);
  return consumed ? "paused" : "stopped";
}

/**
 * Boutons visibles selon le mode (pilotage régie).
 * @param {"inactive" | "stopped" | "running" | "paused"} mode
 */
export function getRegieChronoControlFlags(mode) {
  switch (mode) {
    case "inactive":
      return {
        activer: true,
        demarrer: false,
        reprendre: false,
        pause: false,
        reinitialiser: false,
        desactiver: false,
        regler: true,
      };
    case "stopped":
      return {
        activer: false,
        demarrer: true,
        reprendre: false,
        pause: false,
        reinitialiser: false,
        desactiver: true,
        regler: true,
      };
    case "running":
      return {
        activer: false,
        demarrer: false,
        reprendre: false,
        pause: true,
        reinitialiser: false,
        desactiver: true,
        regler: false,
      };
    case "paused":
      return {
        activer: false,
        demarrer: false,
        reprendre: true,
        pause: false,
        reinitialiser: true,
        desactiver: true,
        regler: false,
      };
    default:
      return {
        activer: false,
        demarrer: false,
        reprendre: false,
        pause: false,
        reinitialiser: false,
        desactiver: false,
        regler: false,
      };
  }
}

/**
 * Sous-libellé (en cours / en pause / à l’arrêt) — uniquement si actif.
 * @param {{
 *   totalSec?: number | null;
 *   remainingSec?: number | null;
 *   accumulatedSec?: number | null;
 *   running?: boolean;
 *   isPaused?: boolean;
 * } | null | undefined} questionTimer
 * @returns {string}
 */
export function getRegieChronoRunningHint(questionTimer) {
  const mode = getRegieChronoControlMode(questionTimer);
  if (mode === "running") return "en cours";
  if (mode === "paused") return "en pause";
  if (mode === "stopped") return "à l’arrêt";
  return "";
}

/**
 * Affichage compact mm:ss / hh:mm:ss (barre haute + ligne pilotage).
 * @param {number | null | undefined} secondes
 */
export function formatCountdownCompact(secondes) {
  if (secondes == null || !Number.isFinite(Number(secondes))) return "—";
  const total = Math.max(0, Math.floor(Number(secondes)));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (d > 0) return `${d}j ${String(h).padStart(2, "0")}h`;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
