"use client";

import { AppHeaderShell } from "@/components/navigation/AppHeaderShell";
import { HeaderAuthCta } from "@/components/navigation/HeaderAuthCta";
import { MARKETING_CONTENT_MAX } from "@/lib/marketingLayout";

export function LandingHeader() {
  return (
    <AppHeaderShell
      logoHref="/"
      logoLabel="AVOTE"
      logoWordmarkSrc="/avote-wordmark.png"
      contentMaxWidth={MARKETING_CONTENT_MAX}
      navItems={[
        { href: "/discover", label: "Les événements", match: "prefix" },
        { href: "/pricing", label: "Tarifs", match: "exact" },
      ]}
      mobileQuickItem={{
        href: "/discover",
        label: "Les événements",
        match: "prefix",
      }}
      mobileMoreItems={[{ href: "/pricing", label: "Tarifs", match: "exact" }]}
      rightSlot={<HeaderAuthCta />}
    />
  );
}
