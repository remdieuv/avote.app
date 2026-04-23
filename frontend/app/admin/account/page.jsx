"use client";

import Link from "next/link";
import { useAdminUser } from "@/components/admin/AdminUserContext";

export default function AdminAccountPage() {
  const { user } = useAdminUser();

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
      </section>
    </main>
  );
}
