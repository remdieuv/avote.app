"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * @param {{
 *  logoHref: string;
 *  logoLabel: string;
 *  logoSrc?: string | null;
 *  logoWordmarkSrc?: string | null;
 *  navItems: Array<{ href: string; label: string; match?: "exact" | "prefix" | "none" }>;
 *  mobileQuickItem?: { href: string; label: string; match?: "exact" | "prefix" | "none" } | null;
 *  rightSlot: import("react").ReactNode;
 * }} props
 */
export function AppHeaderShell({
  logoHref,
  logoLabel,
  logoSrc = null,
  logoWordmarkSrc = null,
  navItems,
  mobileQuickItem = null,
  rightSlot,
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (item) => {
    if (!pathname) return false;
    const mode = item.match || "prefix";
    if (mode === "none") return false;
    if (mode === "exact") return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <header className={`app-header ${scrolled ? "scrolled" : ""}`}>
      <div className="app-header-inner">
        <div className="app-header-left">
          <Link href={logoHref} className="app-header-logo">
            {logoWordmarkSrc ? (
              <img src={logoWordmarkSrc} alt={logoLabel} className="app-header-logo-wordmark" />
            ) : null}
            <span className={`app-header-logo-compact ${logoWordmarkSrc ? "with-wordmark" : ""}`}>
              {logoSrc ? (
                <img src={logoSrc} alt="" className="app-header-logo-image" aria-hidden />
              ) : null}
              <span>{logoLabel}</span>
            </span>
          </Link>
        </div>

        <nav className="app-header-nav" aria-label="Navigation principale">
          {navItems.map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={`app-header-link ${isActive(item) ? "active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="app-header-right">
          {mobileQuickItem ? (
            <Link
              href={mobileQuickItem.href}
              className={`app-header-mobile-quick ${
                isActive(mobileQuickItem) ? "active" : ""
              }`}
            >
              {mobileQuickItem.label}
            </Link>
          ) : null}
          {rightSlot}
        </div>
      </div>

      <style>{`
        .app-header {
          position: sticky;
          top: 0;
          z-index: 1500;
          border-bottom: 1px solid #e2e8f0;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(10px);
          transition: box-shadow .2s ease, background-color .2s ease;
        }
        .app-header.scrolled {
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
          background: rgba(255, 255, 255, 0.96);
        }
        .app-header-inner {
          width: min(1240px, 94vw);
          margin: 0 auto;
          min-height: 56px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
          align-items: center;
          gap: 0.75rem;
        }
        .app-header-left,
        .app-header-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .app-header-left {
          justify-self: start;
          min-width: 0;
        }
        .app-header-right {
          justify-self: end;
          min-width: 0;
          justify-content: flex-end;
        }
        .app-header-logo {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          font-size: 1rem;
          font-weight: 900;
          letter-spacing: -0.03em;
          color: #0f172a;
        }
        .app-header-logo-image {
          width: 1.65rem;
          height: 1.65rem;
          border-radius: 8px;
          object-fit: cover;
          box-shadow: 0 6px 16px rgba(124, 58, 237, 0.2);
          flex-shrink: 0;
        }
        .app-header-logo-wordmark {
          height: 2rem;
          width: auto;
          object-fit: contain;
          display: block;
        }
        .app-header-logo-compact {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        .app-header-logo-compact.with-wordmark {
          display: none;
        }
        .app-header-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
          justify-self: center;
          min-width: 0;
        }
        .app-header-link,
        .app-header-mobile-quick {
          text-decoration: none;
          color: #475569;
          font-size: 0.84rem;
          font-weight: 700;
          border-radius: 9px;
          padding: 0.38rem 0.62rem;
          transition: background-color .16s ease, color .16s ease;
          white-space: nowrap;
        }
        .app-header-link:hover,
        .app-header-mobile-quick:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .app-header-link.active,
        .app-header-mobile-quick.active {
          background: #e0e7ff;
          color: #3730a3;
        }
        .app-header-mobile-quick {
          display: none;
          border: 1px solid #dbeafe;
          background: #f8fbff;
          color: #1d4ed8;
        }
        @media (max-width: 860px) {
          .app-header-inner {
            width: min(100%, 100vw);
            padding: 0 0.6rem;
            box-sizing: border-box;
            grid-template-columns: auto 1fr auto;
          }
          .app-header-nav {
            justify-content: flex-start;
            overflow-x: auto;
            scrollbar-width: none;
            padding-bottom: 1px;
          }
          .app-header-nav::-webkit-scrollbar { display: none; }
        }
        @media (max-width: 640px) {
          .app-header-nav { display: none; }
          .app-header-mobile-quick { display: inline-flex; }
          .app-header-logo { font-size: 0.96rem; }
          .app-header-logo-wordmark { height: 1.78rem; }
          .app-header-logo-compact.with-wordmark { display: none; }
        }
      `}</style>
    </header>
  );
}

