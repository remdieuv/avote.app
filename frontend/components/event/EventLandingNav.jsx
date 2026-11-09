"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AppHeaderShell } from "@/components/navigation/AppHeaderShell";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

/**
 * En-tête discret des Landing `/e/[slug]` — ne recouvre pas le hero.
 * Accès / invitations / médias : hors scope (navigation seule).
 */
export function EventLandingNav() {
  const pathname = usePathname();
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFetch(`${apiBaseBrowser()}/auth/me`, {
          cache: "no-store",
        });
        if (!cancelled) setIsAuthed(res.ok);
      } catch {
        if (!cancelled) setIsAuthed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loginHref = `/login?next=${encodeURIComponent(pathname || "/")}`;

  return (
    <div className="ev-landing-nav">
      <AppHeaderShell
        logoHref="/"
        logoLabel="AVOTE"
        logoWordmarkSrc="/avote-wordmark.png"
        contentMaxWidth={1100}
        navItems={[
          { href: "/discover", label: "Les événements", match: "prefix" },
        ]}
        mobileQuickItem={{
          href: "/discover",
          label: "Les événements",
          match: "prefix",
        }}
        mobileMoreItems={null}
        rightSlot={
          <Link
            href={isAuthed ? "/admin/events" : loginHref}
            className="ev-landing-nav-cta"
          >
            {isAuthed ? "Mes événements" : "Se connecter"}
          </Link>
        }
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
        .ev-landing-nav-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #0f172a;
          text-decoration: none;
          font-size: 0.82rem;
          font-weight: 750;
          padding: 0.42rem 0.7rem;
          white-space: nowrap;
        }
        .ev-landing-nav-cta:hover {
          border-color: #94a3b8;
          background: #f8fafc;
        }
        .ev-landing-nav-cta:focus-visible {
          outline: 2px solid #93c5fd;
          outline-offset: 1px;
        }
        @media (max-width: 640px) {
          .ev-landing-nav-cta {
            font-size: 0.78rem;
            padding: 0.38rem 0.55rem;
          }
        }
      `}</style>
    </div>
  );
}
