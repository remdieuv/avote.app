"use client";

import { AppHeaderShell } from "@/components/navigation/AppHeaderShell";
import { HeaderAuthCta } from "@/components/navigation/HeaderAuthCta";
import { useAuthMe } from "@/components/navigation/useAuthMe";
import { siteNavItems } from "@/lib/siteNav";

/**
 * Header unifié pages classiques (public + connecté).
 * @param {{
 *  contentMaxWidth: number | string;
 *  accountVariant?: "primary" | "subtle";
 * }} props
 */
export function SiteHeader({ contentMaxWidth, accountVariant = "primary" }) {
  const { ready, isAuthed, user, logout } = useAuthMe();
  // Pending / guest : nav publique seule (pas de liens privés non vérifiés).
  const navItems = siteNavItems(ready && isAuthed);
  /** @type {"pending" | "guest" | "authed"} */
  const status = !ready ? "pending" : isAuthed ? "authed" : "guest";

  return (
    <AppHeaderShell
      logoHref="/"
      logoLabel="AVOTE"
      logoWordmarkSrc="/avote-wordmark.png"
      contentMaxWidth={contentMaxWidth}
      navItems={navItems}
      mobileQuickItem={null}
      mobileMoreItems={navItems}
      rightSlot={
        <HeaderAuthCta
          variant={accountVariant}
          status={status}
          user={user}
          logout={logout}
        />
      }
    />
  );
}
