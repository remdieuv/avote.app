"use client";

import { AdminAccountMenu } from "./AdminAccountMenu";
import { AppHeaderShell } from "@/components/navigation/AppHeaderShell";
import { ADMIN_CONTENT_MAX_WORKSPACE } from "@/lib/adminLayout";

export function AdminAccountBar() {
  return (
    <AppHeaderShell
      logoHref="/"
      logoLabel="AVOTE"
      logoWordmarkSrc="/avote-wordmark.png"
      contentMaxWidth={ADMIN_CONTENT_MAX_WORKSPACE}
      navItems={[
        { href: "/admin/events", label: "Mes événements", match: "prefix" },
        { href: "/admin/leads", label: "Mes leads", match: "prefix" },
        { href: "/admin/analytics", label: "Analytics", match: "prefix" },
        { href: "/admin", label: "Créer", match: "exact" },
      ]}
      mobileQuickItem={{ href: "/admin/events", label: "Mes événements", match: "prefix" }}
      mobileMoreItems={[
        { href: "/admin/leads", label: "Mes leads", match: "prefix" },
        { href: "/admin/analytics", label: "Analytics", match: "prefix" },
        { href: "/admin", label: "Créer", match: "exact" },
      ]}
      rightSlot={<AdminAccountMenu />}
    />
  );
}
