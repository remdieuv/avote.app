/**
 * LOT-2 — Diffusion Screen / Overlay : décisions UX pures (pas de moteur live concurrent).
 * Les états live restent dérivés de `resolveLiveUxState` / getUxState.
 */

/**
 * QR coin /screen : uniquement si l’événement est accessible et l’état le justifie.
 * Anti-pattern P8 : jamais de QR si introuvable / erreur / chargement / fin / noir.
 *
 * @param {{
 *   loading?: boolean;
 *   error?: string | null;
 *   eventInvalid?: boolean;
 *   liveScene?: string | null;
 *   displayState?: string | null;
 *   surface?: "question" | "results" | "other" | string | null;
 *   projectionMode?: string | null;
 * }} input
 * @returns {boolean}
 */
export function shouldShowScreenCornerQr(input) {
  const loading = input?.loading === true;
  const eventInvalid = input?.eventInvalid === true;
  const error =
    typeof input?.error === "string" && input.error.trim().length > 0;
  if (loading || eventInvalid || error) return false;

  const live = String(input?.liveScene ?? "").toLowerCase();
  const ds = String(input?.displayState ?? "").toLowerCase();
  if (live === "finished" || live === "paused" || ds === "black") return false;

  const surface = String(input?.surface ?? "other").toLowerCase();
  if (surface === "question") return false;

  const pm = String(input?.projectionMode ?? "standard")
    .trim()
    .toLowerCase();
  if (pm === "results_focus") return false;

  return true;
}

/**
 * Overlay OBS : panneau verre (glass) interdit pour ces cas — fond transparent obligatoire.
 *
 * @param {{
 *   loading?: boolean;
 *   error?: string | null;
 *   eventInvalid?: boolean;
 *   noPollIdle?: boolean;
 *   effectivePanel?: string | null;
 *   displayState?: string | null;
 * }} input
 * @returns {boolean}
 */
export function overlayMustStayTransparent(input) {
  if (input?.loading === true) return true;
  if (input?.eventInvalid === true) return true;
  if (typeof input?.error === "string" && input.error.trim()) return true;
  if (input?.noPollIdle === true) return true;
  const panel = String(input?.effectivePanel ?? "").toLowerCase();
  if (panel === "empty") return true;
  const ds = String(input?.displayState ?? "").toLowerCase();
  if (ds === "black") return true;
  return false;
}

/** Micro-distinction régie (Screen ≠ Overlay). */
export const DIFFUSION_SCREEN_VS_OVERLAY_HINT =
  "Écran = salle / TV · Overlay = fond transparent OBS";

/** Guide OBS 3 gestes (micro-copy, pas un tutoriel). */
export const OBS_GUIDE_STEPS = [
  "Copier l’URL Overlay (preset Stream compact)",
  "Ajouter une Source Navigateur dans OBS",
  "Coller l’URL et vérifier la transparence (pas de rectangle blanc)",
];
