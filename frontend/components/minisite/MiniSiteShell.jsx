"use client";

import Link from "next/link";
import { EventLandingNav } from "@/components/event/EventLandingNav";
import { MiniSiteCompactBanner } from "@/components/minisite/MiniSiteCompactBanner";
import {
  miniSiteTabHref,
  resolveMiniSiteAccent,
  resolveVisibleMiniSiteTabs,
} from "@/lib/miniSiteUi";
import { marketingContentMaxWidth } from "@/lib/marketingLayout";

/**
 * Shell commun du mini-site — Accueil / Participer + Résultats si activé (Lot 2).
 * Bandeau compact sous la nav sur toutes les pages hors Accueil (prépare Lots 3–5).
 * Pas d’onglets Lots 3–5 (Journal, Galerie, À propos), même grisés.
 * @param {{
 *   slug: string;
 *   activeTab: "accueil" | "participer" | "resultats" | string;
 *   primaryColor?: string | null;
 *   tabs?: unknown;
 *   landingPayload?: Record<string, unknown> | null;
 *   children: import("react").ReactNode;
 * }} props
 */
export function MiniSiteShell({
  slug,
  activeTab,
  primaryColor,
  tabs,
  landingPayload = null,
  children,
}) {
  const accent = resolveMiniSiteAccent(primaryColor);
  const visibleTabs = resolveVisibleMiniSiteTabs(
    /** @type {any} */ (tabs),
  );
  const showCompactBanner = activeTab !== "accueil";

  return (
    <main
      className="ms-shell"
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f8fafc 0%, #eef2f7 42%, #f8fafc 100%)",
        fontFamily:
          '"Segoe UI", "Helvetica Neue", ui-sans-serif, system-ui, sans-serif',
        color: "#0f172a",
        ["--ms-accent"]: accent,
      }}
    >
      <style>{`
        .ms-shell { -webkit-font-smoothing: antialiased; }
        .ms-tabs {
          display: flex;
          gap: 0.15rem;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          border-bottom: 1px solid rgba(15, 23, 42, 0.08);
          background: rgba(255,255,255,0.72);
          backdrop-filter: blur(10px);
        }
        .ms-tabs::-webkit-scrollbar { display: none; }
        .ms-tab {
          flex: 0 0 auto;
          padding: 0.85rem 1.1rem;
          font-size: 0.92rem;
          font-weight: 650;
          color: #64748b;
          text-decoration: none;
          border-bottom: 2px solid transparent;
          transition: color 0.15s ease, border-color 0.15s ease;
        }
        .ms-tab:hover { color: #0f172a; }
        .ms-tab--active {
          color: var(--ms-accent, #0f766e);
          border-bottom-color: var(--ms-accent, #0f766e);
        }
        .ms-footer-brand {
          margin-top: 2.5rem;
          padding: 1.5rem 0 2.25rem;
          text-align: center;
          font-size: 0.82rem;
          color: #94a3b8;
        }
        .ms-footer-brand a {
          color: #64748b;
          font-weight: 700;
          text-decoration: none;
        }
        .ms-footer-brand a:hover { color: var(--ms-accent, #0f766e); }
      `}</style>

      <EventLandingNav />

      <nav
        className="ms-tabs"
        aria-label="Navigation du mini-site"
        style={{
          padding: `0 max(0px, calc((100% - ${marketingContentMaxWidth()}) / 2))`,
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            maxWidth: marketingContentMaxWidth(),
            margin: "0 auto",
            padding: "0 0.5rem",
            boxSizing: "border-box",
          }}
        >
          {visibleTabs.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <Link
                key={tab.id}
                href={miniSiteTabHref(slug, tab.hrefSuffix)}
                className={active ? "ms-tab ms-tab--active" : "ms-tab"}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {showCompactBanner ? (
        <MiniSiteCompactBanner payload={landingPayload} />
      ) : null}

      {children}

      <footer className="ms-footer-brand">
        Propulsé par{" "}
        <Link href="/" prefetch={false}>
          AVOTE
        </Link>
      </footer>
    </main>
  );
}
