/**
 * Lot 5 — textes d’aide par onglet Mes événements (distinction Organisés / Favoris / Invitations).
 */

/** @typedef {"organized"|"favorites"|"invitations"} MesEventsSection */

/**
 * @param {MesEventsSection | string} section
 * @returns {{ kicker: string; body: string }}
 */
export function getMesEventsSectionHelp(section) {
  const id = String(section || "").toLowerCase();
  if (id === "favorites") {
    return {
      kicker: "Favoris",
      body: "Événements publics que vous avez enregistrés depuis l’annuaire. Distincts de vos événements organisés et des invitations.",
    };
  }
  if (id === "invitations") {
    return {
      kicker: "Invitations",
      body: "Accès souvenirs aux événements privés partagés avec vous. Pas une liste d’organisation ni de favoris.",
    };
  }
  return {
    kicker: "Organisés",
    body: "Vos événements : régie, page de l’événement et souvenirs. Utilisez le filtre Statut → Terminés pour les clôturés.",
  };
}
