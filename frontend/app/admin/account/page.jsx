"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAdminUser } from "@/components/admin/AdminUserContext";
import { CheckoutEventButton } from "@/components/billing/CheckoutEventButton";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

export default function AdminAccountPage() {
  const { user } = useAdminUser();
  const [eventCredits, setEventCredits] = useState(/** @type {number | null} */ (null));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFetch(`${apiBaseBrowser()}/auth/me`, { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;
        const raw =
          typeof body?.eventCredits === "number"
            ? body.eventCredits
            : typeof body?.user?.eventCredits === "number"
              ? body.user.eventCredits
              : null;
        if (!cancelled) {
          setEventCredits(raw == null ? null : Math.max(0, Number(raw)));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main
      style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "24px 16px 40px",
        fontFamily: 'system-ui, "Segoe UI", sans-serif',
        boxSizing: "border-box",
      }}
    >
      <p style={{ margin: "0 0 1rem", fontSize: "0.88rem" }}>
        <Link href="/admin/events" style={{ color: "#64748b", fontWeight: 600, textDecoration: "none" }}>
          ← Mes événements
        </Link>
      </p>
      <header style={{ marginBottom: "1rem" }}>
        <h1
          style={{
            margin: "0 0 0.35rem",
            fontSize: "clamp(1.4rem, 2.8vw, 1.85rem)",
            fontWeight: 820,
            letterSpacing: "-0.03em",
            color: "#0f172a",
          }}
        >
          Mon compte
        </h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem", maxWidth: "60ch" }}>
          Informations de profil liées à votre espace administrateur.
        </p>
      </header>
      <section
        style={{
          maxWidth: "680px",
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
          padding: "1rem 1.15rem",
        }}
      >
        <p style={{ margin: 0, color: "#475569", fontSize: "0.92rem" }}>
          <span style={{ color: "#64748b", fontWeight: 600 }}>E-mail : </span>
          {user?.email ?? "—"}
        </p>
        <p style={{ margin: "0.7rem 0 0", color: "#0f172a", fontSize: "1rem", fontWeight: 800 }}>
          {`Crédits disponibles : ${
            typeof eventCredits === "number" && !Number.isNaN(eventCredits)
              ? eventCredits
              : "—"
          }`}
        </p>
        <p style={{ margin: "0.35rem 0 0", color: "#64748b", fontSize: "0.84rem", fontWeight: 700 }}>
          1 événement réel = 49€ jusqu’à 500 participants.
        </p>
        <div style={{ marginTop: "0.9rem", maxWidth: "320px" }}>
          <CheckoutEventButton
            label="Acheter un événement (49€)"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.6rem 0.95rem",
              borderRadius: "10px",
              border: "1px solid #7c3aed",
              background: "linear-gradient(180deg, #8b5cf6 0%, #7c3aed 100%)",
              color: "#fff",
              fontWeight: 800,
              fontSize: "0.86rem",
              textDecoration: "none",
              boxShadow: "0 8px 20px rgba(124,58,237,0.22)",
            }}
          />
        </div>
      </section>
    </main>
  );
}
