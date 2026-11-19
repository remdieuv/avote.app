"use client";

import { HeaderAuthCta } from "@/components/navigation/HeaderAuthCta";
import { useAuthMe } from "@/components/navigation/useAuthMe";

/**
 * Compat : menu compte unifié (infos + déconnexion).
 * Préférer `HeaderAuthCta` / `SiteHeader` pour les nouveaux call sites.
 */
export function AdminAccountMenu() {
  const { ready, isAuthed, user, logout } = useAuthMe();
  /** @type {"pending" | "guest" | "authed"} */
  const status = !ready ? "pending" : isAuthed ? "authed" : "guest";
  return (
    <HeaderAuthCta
      variant="subtle"
      status={status}
      user={user}
      logout={logout}
    />
  );
}
