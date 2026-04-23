"use client";

import { AdminAccountMenu } from "./AdminAccountMenu";
import { AppHeaderShell } from "@/components/navigation/AppHeaderShell";

export function AdminAccountBar() {
  return (
    <AppHeaderShell
      logoHref="/"
      logoLabel="Avote"
      logoSrc="/avote-icon.png"
      navItems={[
        { href: "/admin/events", label: "Mes événements", match: "prefix" },
        { href: "/admin/leads", label: "Mes leads", match: "prefix" },
        { href: "/admin", label: "Créer", match: "exact" },
      ]}
      mobileQuickItem={{ href: "/admin/events", label: "Mes événements", match: "prefix" }}
      rightSlot={<AdminAccountMenu />}
    />
  );
}
