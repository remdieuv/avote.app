"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

/**
 * Protège toutes les routes sous `/admin` : session obligatoire.
 */
export function AdminAuthShell({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

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
        if (res.ok) {
          setReady(true);
          return;
        }
        router.replace(`/login?next=${encodeURIComponent(path)}`);
      } catch {
        if (!cancelled) {
          router.replace(`/login?next=${encodeURIComponent(path)}`);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
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

  return children;
}
