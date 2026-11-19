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
  const { isAuthed, user, logout } = useAuthMe();
  const navItems = siteNavItems(isAuthed);

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
          isAuthed={isAuthed}
          user={user}
          logout={logout}
        />
      }
    />
  );
}
