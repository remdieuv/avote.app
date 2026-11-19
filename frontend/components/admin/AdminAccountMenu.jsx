"use client";

import { HeaderAuthCta } from "@/components/navigation/HeaderAuthCta";

/**
 * Compat : menu compte unifié (infos + déconnexion).
 * Préférer `HeaderAuthCta` / `SiteHeader` pour les nouveaux call sites.
 */
export function AdminAccountMenu() {
  return <HeaderAuthCta variant="subtle" />;
}
