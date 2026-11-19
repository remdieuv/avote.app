"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import {
  clearAuthSession,
  seedAuthSession,
} from "@/components/navigation/useAuthMe";
import { AdminAccountBar } from "./AdminAccountBar";
import { AdminUserContext } from "./AdminUserContext";

/**
 * Protège toutes les routes sous `/admin` : session obligatoire.
 */
export function AdminAuthShell({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(
    /** @type {{ id: string; email: string; eventCredits?: number | null; activationsAvailable?: { FUN: number; EVENT: number } | null } | null} */ (null),
  );

  useEffect(() => {
    let cancelled = false;
    const path =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search || ""}`
        : "/admin";

    (async () => {
      try {
        const res = await adminFetch(`${apiBaseBrowser()}/auth/me`);
        if (cancelled) return;
        if (!res.ok) {
          clearAuthSession();
          router.replace(`/login?next=${encodeURIComponent(path)}`);
          return;
        }
        const data = await res.json().catch(() => ({}));
        const u = data?.user;
        if (
          u &&
          typeof u.id === "string" &&
          typeof u.email === "string"
        ) {
          const creditsRaw =
            typeof data?.eventCredits === "number"
              ? data.eventCredits
              : typeof u?.eventCredits === "number"
                ? u.eventCredits
                : null;
          const availRaw =
            data?.activationsAvailable ?? u?.activationsAvailable ?? null;
          /** @type {{ FUN: number; EVENT: number } | null} */
          let activationsAvailable = null;
          if (availRaw && typeof availRaw === "object") {
            const funRaw = Number(availRaw.FUN);
            const eventRaw = Number(availRaw.EVENT);
            activationsAvailable = {
              FUN: Number.isFinite(funRaw) ? Math.max(0, funRaw) : 0,
              EVENT: Number.isFinite(eventRaw) ? Math.max(0, eventRaw) : 0,
            };
          }
          const nextUser = {
            id: u.id,
            email: u.email,
            eventCredits:
              creditsRaw == null || Number.isNaN(Number(creditsRaw))
                ? null
                : Math.max(0, Number(creditsRaw)),
            activationsAvailable,
          };
          setUser(nextUser);
          seedAuthSession(nextUser);
          setReady(true);
          return;
        }
        clearAuthSession();
        router.replace(`/login?next=${encodeURIComponent(path)}`);
      } catch {
        if (!cancelled) {
          clearAuthSession();
          router.replace(`/login?next=${encodeURIComponent(path)}`);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await adminFetch(`${apiBaseBrowser()}/auth/logout`, { method: "POST" });
    } catch {
      /* cookie cleared best-effort */
    }
    clearAuthSession();
    router.replace("/login");
  }, [router]);

  const ctx = useMemo(() => ({ user, logout }), [user, logout]);

  if (!ready || !user) {
    return (
      <div
        style={{
          minHeight: "50vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: 'system-ui, "Segoe UI", sans-serif',
          color: "#64748b",
          fontSize: "0.95rem",
        }}
      >
        Vérification de la session…
      </div>
    );
  }

  return (
    <AdminUserContext.Provider value={ctx}>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          width: "100%",
        }}
      >
        <AdminAccountBar />
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
    </AdminUserContext.Provider>
  );
}
