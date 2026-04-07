"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * @param {{
 *  logoHref: string;
 *  logoLabel: string;
 *  navItems: Array<{ href: string; label: string; match?: "exact" | "prefix" | "none" }>;
 *  mobileQuickItem?: { href: string; label: string; match?: "exact" | "prefix" | "none" } | null;
 *  rightSlot: import("react").ReactNode;
 * }} props
 */
export function AppHeaderShell({
  logoHref,
  logoLabel,
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
            {logoLabel}
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
          width: min(1500px, 96vw);
          margin: 0 auto;
          min-height: 56px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 0.75rem;
        }
        .app-header-left,
        .app-header-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .app-header-logo {
          text-decoration: none;
          font-size: 1rem;
          font-weight: 900;
          letter-spacing: -0.03em;
          color: #0f172a;
        }
        .app-header-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
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
        }
      `}</style>
    </header>
  );
}

