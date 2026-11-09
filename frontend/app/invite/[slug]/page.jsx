"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import { marketingContentShellStyle } from "@/lib/marketingLayout";

/**
 * Lot F — page d’accès invitation (compte + code une fois).
 */
export default function InviteAccessPage() {
  const params = useParams();
  const router = useRouter();
  const slugParam = params?.slug;
  const slug =
    typeof slugParam === "string" ? slugParam : slugParam?.[0] ?? null;

  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(/** @type {null | Record<string, any>} */ (null));
  const [error, setError] = useState(/** @type {string|null} */ (null));
  const [isAuthed, setIsAuthed] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    try {
      const me = await adminFetch(`${apiBaseBrowser()}/auth/me`, {
        cache: "no-store",
      });
      setIsAuthed(me.ok);
      const res = await adminFetch(
        `${apiBaseBrowser()}/invite/${encodeURIComponent(slug)}`,
        { cache: "no-store" },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || `Erreur ${res.status}`);
      }
      setMeta(body.event || null);
      if (body?.event?.hasAccess && body?.event?.landingPath) {
        router.replace(body.event.landingPath);
      }
    } catch (e) {
      setMeta(null);
      setError(e?.message || "Impossible de charger l’invitation.");
    } finally {
      setLoading(false);
    }
  }, [router, slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function redeem(e) {
    e.preventDefault();
    if (!slug) return;
    setBusy(true);
    setError(null);
    try {
      if (!isAuthed) {
        router.push(
          `/login?next=${encodeURIComponent(`/invite/${encodeURIComponent(slug)}`)}`,
        );
        return;
      }
      const res = await adminFetch(
        `${apiBaseBrowser()}/invite/${encodeURIComponent(slug)}/redeem`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || `Erreur ${res.status}`);
      }
      const landing = body?.event?.landingPath || `/e/${slug}`;
      router.replace(landing);
    } catch (err) {
      setError(err?.message || "Code invalide.");
    } finally {
      setBusy(false);
    }
  }

  const title = meta?.title || "Événement";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f8fafc 0%, #fff 42%)",
        fontFamily: "system-ui, sans-serif",
        color: "#0f172a",
      }}
    >
      <LandingHeader />
      <main
        style={{
          ...marketingContentShellStyle(),
          paddingTop: "2.5rem",
          paddingBottom: "3rem",
          maxWidth: 480,
        }}
      >
        {loading ? <p style={{ color: "#64748b" }}>Chargement…</p> : null}
        {!loading && error && !meta ? (
          <div>
            <p style={{ color: "#b91c1c", fontWeight: 700 }}>{error}</p>
            <Link href="/">Retour à l’accueil</Link>
          </div>
        ) : null}
        {!loading && meta ? (
          <>
            <p
              style={{
                margin: 0,
                fontSize: "0.75rem",
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#64748b",
              }}
            >
              Accès sur invitation
            </p>
            <h1
              style={{
                margin: "0.35rem 0 0.55rem",
                fontSize: "1.65rem",
                fontWeight: 900,
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </h1>
            <p style={{ margin: "0 0 1.25rem", color: "#475569", lineHeight: 1.55 }}>
              Les souvenirs de cet événement sont protégés. Connectez-vous avec un
              compte AVOTE gratuit, puis saisissez le code fourni par
              l’organisateur. Le live et le vote restent accessibles sans code via
              la salle.
            </p>

            {!meta.inviteEnabled ? (
              <p style={{ color: "#64748b" }}>
                Aucune invitation active pour cet événement.{" "}
                {meta.landingPath ? (
                  <Link href={meta.landingPath}>Voir la page</Link>
                ) : (
                  <Link href={meta.joinPath || "/"}>Rejoindre le live</Link>
                )}
              </p>
            ) : null}

            {meta.inviteEnabled && meta.hasAccess ? (
              <p style={{ fontWeight: 700, color: "#15803d" }}>
                Accès déjà accordé.{" "}
                {meta.landingPath ? (
                  <Link href={meta.landingPath}>Ouvrir les souvenirs</Link>
                ) : null}
              </p>
            ) : null}

            {meta.inviteEnabled && !meta.hasAccess ? (
              <>
                {!isAuthed ? (
                  <div
                    style={{
                      marginBottom: "1rem",
                      padding: "0.9rem 1rem",
                      borderRadius: 12,
                      border: "1px solid #bfdbfe",
                      background: "#eff6ff",
                    }}
                  >
                    <p style={{ margin: "0 0 0.65rem", fontWeight: 700 }}>
                      Étape 1 — Compte AVOTE
                    </p>
                    <Link
                      href={`/login?next=${encodeURIComponent(`/invite/${slug}`)}`}
                      style={btnPrimary}
                    >
                      Se connecter ou créer un compte
                    </Link>
                  </div>
                ) : (
                  <p
                    style={{
                      margin: "0 0 0.85rem",
                      fontSize: "0.86rem",
                      fontWeight: 700,
                      color: "#15803d",
                    }}
                  >
                    Compte connecté — saisissez le code d’accès.
                  </p>
                )}

                <form onSubmit={(ev) => void redeem(ev)} style={{ display: "grid", gap: "0.65rem" }}>
                  <label style={{ display: "grid", gap: "0.3rem", fontWeight: 800, fontSize: "0.8rem", color: "#475569" }}>
                    Code d’accès
                    <input
                      value={code}
                      onChange={(ev) => setCode(ev.target.value)}
                      autoComplete="one-time-code"
                      placeholder="Code fourni par l’organisateur"
                      disabled={!isAuthed || busy}
                      style={{
                        minHeight: 44,
                        padding: "0.55rem 0.7rem",
                        borderRadius: 10,
                        border: "1px solid #cbd5e1",
                        fontSize: "1rem",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    />
                  </label>
                  {error ? (
                    <p role="alert" style={{ margin: 0, color: "#b91c1c", fontWeight: 700 }}>
                      {error}
                    </p>
                  ) : null}
                  <button type="submit" disabled={!isAuthed || busy || !code.trim()} style={btnPrimary}>
                    {busy ? "Vérification…" : "Accéder aux souvenirs"}
                  </button>
                </form>
              </>
            ) : null}

            <p style={{ marginTop: "1.5rem", fontSize: "0.86rem", color: "#64748b" }}>
              Vous participez au live ?{" "}
              <Link href={meta.joinPath || `/join/${slug}`} style={{ fontWeight: 750 }}>
                Rejoindre la salle
              </Link>{" "}
              — aucun code requis pour voter.
            </p>
            <p style={{ marginTop: "0.75rem", fontSize: "0.86rem" }}>
              <Link href="/admin/events" style={{ color: "#1d4ed8", fontWeight: 700 }}>
                Mes événements → Invitations
              </Link>
            </p>
          </>
        ) : null}
      </main>
    </div>
  );
}

const btnPrimary = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  padding: "0.55rem 1rem",
  borderRadius: 10,
  border: "1px solid #1d4ed8",
  background: "#1d4ed8",
  color: "#fff",
  fontWeight: 800,
  textDecoration: "none",
  cursor: "pointer",
};
