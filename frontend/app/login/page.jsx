"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

const field = {
  width: "100%",
  padding: "0.55rem 0.65rem",
  fontSize: "1rem",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextRaw = searchParams.get("next");
  const nextPath =
    nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/admin/events";

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const path = mode === "register" ? "/auth/register" : "/auth/login";
      const res = await adminFetch(`${apiBaseBrowser()}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || `Erreur ${res.status}`);
      }
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err?.message || "Échec.");
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
          {mode === "register" ? "Créer un compte" : "Connexion"}
        </h1>
        <p style={{ margin: "0 0 1.25rem", color: "#64748b", fontSize: "0.9rem" }}>
          Accès réservé à l’administration des événements.
        </p>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.82rem", fontWeight: 600, color: "#334155" }}>
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
          <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.82rem", fontWeight: 600, color: "#334155" }}>
            Mot de passe
            <input
              type="password"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
              minLength={mode === "register" ? 8 : undefined}
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
            {busy ? "Patientez…" : mode === "register" ? "S’inscrire" : "Se connecter"}
          </button>
        </form>

        <p style={{ margin: "1.1rem 0 0", fontSize: "0.85rem", color: "#64748b" }}>
          {mode === "register" ? (
            <>
              Déjà un compte ?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError(null);
                }}
                style={{ border: "none", background: "none", color: "#2563eb", fontWeight: 700, cursor: "pointer", padding: 0 }}
              >
                Connexion
              </button>
            </>
          ) : (
            <>
              Pas encore de compte ?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError(null);
                }}
                style={{ border: "none", background: "none", color: "#2563eb", fontWeight: 700, cursor: "pointer", padding: 0 }}
              >
                Inscription
              </button>
            </>
          )}
        </p>

        <p style={{ margin: "1rem 0 0", fontSize: "0.82rem" }}>
          <Link href="/" style={{ color: "#64748b", fontWeight: 600 }}>
            ← Accueil public
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "40vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
          Chargement…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
