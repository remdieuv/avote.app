"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

const NAV = [
  { href: "/admin-internal", label: "Dashboard" },
  { href: "/admin-internal/users", label: "Utilisateurs" },
  { href: "/admin-internal/events", label: "Événements" },
  { href: "/admin-internal/leads", label: "Leads" },
];

export function InternalAdminShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const path =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search || ""}`
        : "/admin-internal";

    (async () => {
      try {
        const res = await adminFetch(`${apiBaseBrowser()}/auth/me`);
        if (cancelled) return;
        if (!res.ok) {
          router.replace(`/login?next=${encodeURIComponent(path)}`);
          return;
        }
        const data = await res.json().catch(() => ({}));
        const u = data?.user;
        if (!u?.id || !u?.email) {
          router.replace(`/login?next=${encodeURIComponent(path)}`);
          return;
        }
        if (String(u.role || "").toUpperCase() !== "ADMIN") {
          router.replace("/admin/events");
          return;
        }
        setUser(u);
        setReady(true);
      } catch {
        if (!cancelled) router.replace(`/login?next=${encodeURIComponent(path)}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const activeHref = useMemo(() => {
    const exact = NAV.find((x) => x.href === pathname);
    if (exact) return exact.href;
    const pref = NAV.find((x) => pathname?.startsWith(`${x.href}/`));
    return pref?.href || "/admin-internal";
  }, [pathname]);

  async function logout() {
    try {
      await adminFetch(`${apiBaseBrowser()}/auth/logout`, { method: "POST" });
    } catch {
      /* noop */
    }
    router.replace("/login");
  }

  if (!ready || !user) {
    return (
      <div
        style={{
          minHeight: "50vh",
          display: "grid",
          placeItems: "center",
          color: "#64748b",
        }}
      >
        Vérification de l’accès admin interne…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          borderBottom: "1px solid #e2e8f0",
          background: "#fff",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0.75rem 1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                color: "#0f172a",
                textDecoration: "none",
              }}
            >
              <img
                src="/avote-wordmark.png"
                alt="AVOTE"
                style={{
                  height: "1.95rem",
                  width: "auto",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </Link>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Back-office interne</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link href="/admin/events" style={{ fontSize: "0.82rem", color: "#475569", textDecoration: "none" }}>
              Retour app
            </Link>
            <span style={{ fontSize: "0.8rem", color: "#334155", padding: "0.22rem 0.5rem", borderRadius: "9999px", background: "#eff6ff", border: "1px solid #bfdbfe" }}>
              ADMIN
            </span>
            <button type="button" onClick={logout} style={{ padding: "0.38rem 0.6rem", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: "0.78rem" }}>
              Déconnexion
            </button>
          </div>
        </div>
        <nav style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 1rem 0.7rem 1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {NAV.map((item) => {
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  textDecoration: "none",
                  fontSize: "0.86rem",
                  fontWeight: active ? 700 : 600,
                  color: active ? "#1d4ed8" : "#475569",
                  background: active ? "#eff6ff" : "#fff",
                  border: `1px solid ${active ? "#bfdbfe" : "#e2e8f0"}`,
                  borderRadius: "9999px",
                  padding: "0.35rem 0.7rem",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "1rem" }}>{children}</main>
    </div>
  );
}
