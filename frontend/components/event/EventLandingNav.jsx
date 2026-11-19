"use client";

import { AppHeaderShell } from "@/components/navigation/AppHeaderShell";
import { HeaderAuthCta } from "@/components/navigation/HeaderAuthCta";
import { MARKETING_CONTENT_MAX } from "@/lib/marketingLayout";

/**
 * En-tête discret des Landing `/e/[slug]` — ne recouvre pas le hero.
 * Accès / invitations / médias : hors scope (navigation seule).
 */
export function EventLandingNav() {
  return (
    <div className="ev-landing-nav">
      <AppHeaderShell
        logoHref="/"
        logoLabel="AVOTE"
        logoWordmarkSrc="/avote-wordmark.png"
        contentMaxWidth={MARKETING_CONTENT_MAX}
        navItems={[
          { href: "/discover", label: "Les événements", match: "prefix" },
        ]}
        mobileQuickItem={{
          href: "/discover",
          label: "Les événements",
          match: "prefix",
        }}
        mobileMoreItems={null}
        rightSlot={<HeaderAuthCta variant="subtle" />}
      />
      <style>{`
        .ev-landing-nav {
          position: relative;
          z-index: 20;
          background: rgba(248, 250, 252, 0.92);
          border-bottom: 1px solid rgba(226, 232, 240, 0.9);
          backdrop-filter: blur(8px);
        }
        .ev-landing-nav .app-header {
          position: relative;
          top: auto;
          background: transparent;
          border-bottom: none;
          box-shadow: none;
        }
        .ev-landing-nav .app-header.scrolled {
          box-shadow: none;
          background: transparent;
        }
      `}</style>
    </div>
  );
}
