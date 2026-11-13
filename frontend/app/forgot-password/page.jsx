"use client";

import Link from "next/link";
import { useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

const field = {
  width: "100%",
  padding: "0.55rem 0.65rem",
  fontSize: "1rem",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(/** @type {string|null} */ (null));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await adminFetch(`${apiBaseBrowser()}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `Erreur ${res.status}`);
      }
      setDone(true);
    } catch (err) {
      setError(err?.message || "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        boxSizing: "border-box",
        fontFamily: 'system-ui, "Segoe UI", sans-serif',
        background: "linear-gradient(180deg, #f1f5f9 0%, #f8fafc 40%, #fff 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "1.75rem",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          background: "#fff",
          boxShadow: "0 8px 28px rgba(15, 23, 42, 0.08)",
        }}
      >
        <h1
          style={{
            margin: "0 0 0.35rem",
            fontSize: "1.35rem",
            fontWeight: 800,
            color: "#0f172a",
            letterSpacing: "-0.02em",
          }}
        >
          Mot de passe oublié
        </h1>
        <p style={{ margin: "0 0 1.25rem", color: "#64748b", fontSize: "0.9rem", lineHeight: 1.5 }}>
          Indiquez l’e-mail de votre compte. Si un compte existe, vous recevrez un lien
          de réinitialisation (valable 1&nbsp;heure, usage unique).
        </p>

        {done ? (
          <p
            role="status"
            style={{
              margin: 0,
              padding: "0.75rem 0.85rem",
              borderRadius: 10,
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              color: "#166534",
              fontSize: "0.9rem",
              fontWeight: 600,
              lineHeight: 1.45,
            }}
          >
            Si un compte existe pour cet e-mail, un lien de réinitialisation a été envoyé.
            Pensez à vérifier vos courriers indésirables.
          </p>
        ) : (
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#334155",
              }}
            >
              E-mail
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                required
                style={field}
              />
            </label>

            {error ? (
              <p role="alert" style={{ margin: 0, color: "#b91c1c", fontSize: "0.88rem" }}>
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              style={{
                marginTop: "0.25rem",
                padding: "0.65rem 1rem",
                fontSize: "0.95rem",
                fontWeight: 700,
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(180deg, #2563eb, #1d4ed8)",
                color: "#fff",
                cursor: busy ? "wait" : "pointer",
              }}
            >
              {busy ? "Envoi…" : "Envoyer le lien"}
            </button>
          </form>
        )}

        <p style={{ margin: "1.1rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
          <Link href="/login" style={{ color: "#2563eb", fontWeight: 700 }}>
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
