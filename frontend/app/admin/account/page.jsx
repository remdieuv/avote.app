"use client";

import Link from "next/link";
import { useAdminUser } from "@/components/admin/AdminUserContext";

export default function AdminAccountPage() {
  const { user } = useAdminUser();

  return (
    <main
      style={{
        maxWidth: "32rem",
        margin: "0 auto",
        padding: "1.25rem 1rem 2rem",
        fontFamily: 'system-ui, "Segoe UI", sans-serif',
      }}
    >
      <p style={{ margin: "0 0 1rem", fontSize: "0.875rem" }}>
        <Link href="/admin/events" style={{ color: "#64748b", fontWeight: 600 }}>
          ← Mes événements
        </Link>
      </p>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 800, margin: "0 0 0.75rem", color: "#0f172a" }}>
        Mon compte
      </h1>
      <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem" }}>
        <span style={{ color: "#64748b", fontWeight: 600 }}>E-mail : </span>
        {user?.email ?? "—"}
      </p>
    </main>
  );
}
