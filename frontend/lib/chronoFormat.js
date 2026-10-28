/** Durée max du chrono scène (doit rester alignée avec l’API). */
export const QUESTION_TIMER_MAX_SEC = 90 * 24 * 60 * 60;

/**
 * Offset horloge client − serveur (ms) au moment `nowMs`.
 * Positif = client en avance sur le serveur.
 * À figer via `syncQuestionTimerClockOffset` à la réception du snapshot
 * (ne pas recalculer à chaque tick avec le même `serverNow`).
 *
 * @param {{ serverNow?: string | null } | null | undefined} tm
 * @param {number} [nowMs]
 */
export function resolveQuestionTimerClockOffsetMs(tm, nowMs = Date.now()) {
  if (!tm || typeof tm.serverNow !== "string") return 0;
  const serverMs = Date.parse(tm.serverNow);
  if (!Number.isFinite(serverMs)) return 0;
  return nowMs - serverMs;
}

/**
 * Figé l’offset tant que `serverNow` / `startedAt` du snapshot n’ont pas changé.
 *
 * @param {{
 *   serverNow?: string | null;
 *   startedAt?: string | null;
 * } | null | undefined} tm
 * @param {{
 *   offsetMs: number;
 *   serverNow: string | null;
 *   startedAt: string | null;
 * }} slot
 * @param {number} [nowMs]
 * @returns {number}
 */
export function syncQuestionTimerClockOffset(tm, slot, nowMs = Date.now()) {
  const sn = typeof tm?.serverNow === "string" ? tm.serverNow : null;
  const sa = typeof tm?.startedAt === "string" ? tm.startedAt : null;
  if (sn !== slot.serverNow || sa !== slot.startedAt) {
    slot.serverNow = sn;
    slot.startedAt = sa;
    slot.offsetMs = resolveQuestionTimerClockOffsetMs(tm, nowMs);
  }
  return slot.offsetMs;
}

/**
 * Secondes restantes affichables (régie, Screen, overlay, salle).
 * En running : aligne via `clockOffsetMs` (dérivé de `serverNow`) pour éviter
 * d’ajouter des secondes si l’horloge client est en retard sur le serveur.
 *
 * @param {{
 *   totalSec?: number | null;
 *   remainingSec?: number | null;
 *   accumulatedSec?: number | null;
 *   startedAt?: string | null;
 *   serverNow?: string | null;
 *   running?: boolean;
 *   isPaused?: boolean;
 * } | null | undefined} tm
 * @param {number} [nowMs]
 * @param {number} [clockOffsetMs] clientNow − serverNow figé au snapshot
 * @returns {number | null}
 */
export function chronoRestantSecondes(tm, nowMs = Date.now(), clockOffsetMs = 0) {
  if (!tm || typeof tm.totalSec !== "number") return null;
  if (!tm.running || tm.isPaused) {
    return typeof tm.remainingSec === "number" ? tm.remainingSec : null;
  }
  if (typeof tm.startedAt !== "string") return tm.remainingSec ?? null;
  const startedMs = Date.parse(tm.startedAt);
  if (!Number.isFinite(startedMs)) return tm.remainingSec ?? null;
  const offset = Number.isFinite(clockOffsetMs) ? clockOffsetMs : 0;
  const nowServerApprox = nowMs - offset;
  const seg = Math.max(0, Math.floor((nowServerApprox - startedMs) / 1000));
  const acc = typeof tm.accumulatedSec === "number" ? tm.accumulatedSec : 0;
  return Math.max(0, tm.totalSec - acc - seg);
}

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
  // Ligne principale : jamais de Réinitialiser (réservé au panneau Régler).
  switch (mode) {
    case "inactive":
      return {
        activer: true,
        demarrer: false,
        reprendre: false,
        pause: false,
        desactiver: false,
        regler: true,
      };
    case "stopped":
      return {
        activer: false,
        demarrer: true,
        reprendre: false,
        pause: false,
        desactiver: true,
        regler: true,
      };
    case "running":
      return {
        activer: false,
        demarrer: false,
        reprendre: false,
        pause: true,
        desactiver: true,
        regler: true,
      };
    case "paused":
      return {
        activer: false,
        demarrer: false,
        reprendre: true,
        pause: false,
        desactiver: true,
        regler: true,
      };
    default:
      return {
        activer: false,
        demarrer: false,
        reprendre: false,
        pause: false,
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
