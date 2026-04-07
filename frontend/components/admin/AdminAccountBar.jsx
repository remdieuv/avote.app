"use client";

import { AdminAccountMenu } from "./AdminAccountMenu";
import { AppHeaderShell } from "@/components/navigation/AppHeaderShell";

export function AdminAccountBar() {
  return (
    <AppHeaderShell
      logoHref="/admin/events"
      logoLabel="Avote"
      navItems={[
        { href: "/admin/events", label: "Mes événements", match: "prefix" },
        { href: "/admin", label: "Créer", match: "exact" },
        { href: "/", label: "Site", match: "none" },
      ]}
      mobileQuickItem={{ href: "/admin/events", label: "Mes événements", match: "prefix" }}
      rightSlot={<AdminAccountMenu />}
    />
  );
}
