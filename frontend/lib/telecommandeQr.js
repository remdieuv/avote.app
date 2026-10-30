/**
 * Accès QR Télécommande mobile (orga) — distinct du QR participant.
 * FE only : le lien pointe vers la régie protégée (`AdminAuthShell`).
 */

/**
 * Chemin relatif télécommande / régie pour un événement.
 * @param {string | null | undefined} eventId
 * @returns {string}
 */
export function buildTelecommandePath(eventId) {
  const id = typeof eventId === "string" ? eventId.trim() : "";
  if (!id) return "";
  return `/admin/event/${encodeURIComponent(id)}`;
}

/**
 * URL absolue scannable (origine + chemin).
 * @param {{ origin?: string | null; eventId?: string | null }} input
 * @returns {string}
 */
export function buildTelecommandeAbsoluteUrl(input = {}) {
  const path = buildTelecommandePath(input.eventId);
  if (!path) return "";
  const origin =
    typeof input.origin === "string" ? input.origin.replace(/\/$/, "") : "";
  if (!origin) return path;
  return `${origin}${path}`;
}

/**
 * Libellés UI — distinguer clairement du QR audience / participation.
 */
export const TELECOMMANDE_QR_COPY = Object.freeze({
  title: "Télécommande mobile",
  badge: "Organisateur",
  audienceBadgeContrast: "Participation",
  hint:
    "Scannez avec votre téléphone pour ouvrir la télécommande. Si vous n’êtes pas connecté, la page de connexion s’affiche puis revient ici.",
  copyLabel: "Copier le lien",
  copiedLabel: "Copié",
  openLabel: "Ouvrir",
  closeLabel: "Fermer",
  triggerAria: "Afficher le QR télécommande mobile",
  triggerButton: "Télécommande mobile",
});
