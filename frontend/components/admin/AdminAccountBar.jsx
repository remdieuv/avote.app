"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminAccountMenu } from "./AdminAccountMenu";

export function AdminAccountBar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href) => {
    if (!pathname) return false;
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className={`admin-global-header ${scrolled ? "scrolled" : ""}`}>
      <div className="admin-global-header-inner">
        <div className="admin-global-left">
          <Link href="/admin/events" className="admin-global-logo">
            Avote
          </Link>
        </div>

        <nav className="admin-global-nav" aria-label="Navigation principale admin">
          <Link
            href="/admin/events"
            className={`admin-global-link ${isActive("/admin/events") ? "active" : ""}`}
          >
            Mes événements
          </Link>
          <Link
            href="/admin"
            className={`admin-global-link ${isActive("/admin") ? "active" : ""}`}
          >
            Créer
          </Link>
          <Link href="/" className="admin-global-link">
            Accueil
          </Link>
        </nav>

        <div className="admin-global-right">
          <Link
            href="/admin/events"
            className={`admin-global-mobile-link ${isActive("/admin/events") ? "active" : ""}`}
          >
            Mes événements
          </Link>
          <AdminAccountMenu />
        </div>
      </div>

      <style>{`
        .admin-global-header {
          position: sticky;
          top: 0;
          z-index: 1500;
          border-bottom: 1px solid #e2e8f0;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(10px);
          transition: box-shadow .2s ease, background-color .2s ease;
        }
        .admin-global-header.scrolled {
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
          background: rgba(255, 255, 255, 0.96);
        }
        .admin-global-header-inner {
          width: min(1500px, 96vw);
          margin: 0 auto;
          min-height: 56px;
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 0.75rem;
        }
        .admin-global-left,
        .admin-global-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .admin-global-logo {
          text-decoration: none;
          font-size: 1rem;
          font-weight: 900;
          letter-spacing: -0.03em;
          color: #0f172a;
        }
        .admin-global-nav {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.35rem;
        }
        .admin-global-link,
        .admin-global-mobile-link {
          text-decoration: none;
          color: #475569;
          font-size: 0.84rem;
          font-weight: 700;
          border-radius: 9px;
          padding: 0.38rem 0.62rem;
          transition: background-color .16s ease, color .16s ease;
        }
        .admin-global-link:hover,
        .admin-global-mobile-link:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .admin-global-link.active,
        .admin-global-mobile-link.active {
          background: #e0e7ff;
          color: #3730a3;
        }
        .admin-global-mobile-link {
          display: none;
          border: 1px solid #dbeafe;
          background: #f8fbff;
          color: #1d4ed8;
        }
        @media (max-width: 860px) {
          .admin-global-header-inner {
            width: min(100%, 100vw);
            padding: 0 0.6rem;
            box-sizing: border-box;
            grid-template-columns: auto 1fr auto;
          }
          .admin-global-nav {
            justify-content: flex-start;
            overflow-x: auto;
            scrollbar-width: none;
            padding-bottom: 1px;
          }
          .admin-global-nav::-webkit-scrollbar { display: none; }
        }
        @media (max-width: 640px) {
          .admin-global-nav { display: none; }
          .admin-global-mobile-link { display: inline-flex; }
          .admin-global-logo { font-size: 0.96rem; }
        }
      `}</style>
    </header>
  );
}
