"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import { AppHeaderShell } from "@/components/navigation/AppHeaderShell";

export function LandingHeader() {
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFetch(`${apiBaseBrowser()}/auth/me`);
        if (!cancelled) setIsAuthed(res.ok);
      } catch {
        if (!cancelled) setIsAuthed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppHeaderShell
      logoHref="/"
      logoLabel="Avote"
      navItems={[
        { href: "/#how", label: "Comment ça marche", match: "none" },
        { href: "/join/demo", label: "Démo", match: "none" },
        { href: "/admin/events", label: "Produit", match: "none" },
      ]}
      mobileQuickItem={{ href: "/admin/events", label: "Produit", match: "none" }}
      rightSlot={
        <Link href={isAuthed ? "/admin/events" : "/admin"} className="landing-header-cta">
          {isAuthed ? "Mes événements" : "Créer un événement"}
          <style>{`
            .landing-header-cta {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              border-radius: 10px;
              border: 1px solid #1d4ed8;
              background: linear-gradient(180deg, #2563eb, #1d4ed8);
              color: #fff;
              text-decoration: none;
              font-size: 0.84rem;
              font-weight: 800;
              padding: 0.45rem 0.75rem;
              white-space: nowrap;
              box-shadow: 0 8px 22px rgba(37, 99, 235, 0.22);
            }
            .landing-header-cta:hover {
              filter: brightness(1.03);
            }
            .landing-header-cta:focus-visible {
              outline: 2px solid #93c5fd;
              outline-offset: 1px;
            }
            @media (max-width: 640px) {
              .landing-header-cta {
                font-size: 0.8rem;
                padding: 0.4rem 0.6rem;
              }
            }
          `}</style>
        </Link>
      }
    />
  );
}

