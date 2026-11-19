"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

/**
 * Session légère pour headers (public ou admin).
 * Ignore les 401 (guest) — pas d’erreur UI.
 * @returns {{
 *   ready: boolean;
 *   isAuthed: boolean;
 *   user: { id?: string; email?: string; eventCredits?: number | null; activationsAvailable?: Record<string, number> | null } | null;
 *   logout: () => Promise<void>;
 * }}
 */
export function useAuthMe() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFetch(`${apiBaseBrowser()}/auth/me`, {
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) {
          setUser(null);
          setReady(true);
          return;
        }
        const data = await res.json().catch(() => ({}));
        const u = data?.user;
        if (u && typeof u.email === "string") {
          setUser(u);
        } else {
          setUser(null);
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminFetch(`${apiBaseBrowser()}/auth/logout`, { method: "POST" });
    } catch {
      /* best-effort */
    }
    setUser(null);
    router.replace("/login");
  }, [router]);

  return {
    ready,
    isAuthed: Boolean(user?.email),
    user,
    logout,
  };
}
