"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import { marketingContentShellStyle } from "@/lib/marketingLayout";

/**
 * Lot D — page publique organisateur.
 * Prépare le bouton Suivre (Lot E) sans l’activer.
 */
export default function OrganizerPublicPage() {
  const params = useParams();
  const slugParam = params?.slug;
  const slug =
    typeof slugParam === "string" ? slugParam : slugParam?.[0] ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {string|null} */ (null));
  const [payload, setPayload] = useState(/** @type {null | Record<string, any>} */ (null));

  useEffect(() => {
    if (!slug) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await adminFetch(
          `${apiBaseBrowser()}/organizers/${encodeURIComponent(slug)}`,
          { cache: "no-store" },
        );
        if (res.status === 404) {
          if (!cancelled) {
            setError("Profil introuvable.");
            setPayload(null);
          }
          return;
        }
        if (!res.ok) {
          if (!cancelled) setError(`Erreur ${res.status}`);
          return;
        }
        const data = await res.json();
        if (!cancelled) setPayload(data);
      } catch {
        if (!cancelled) setError("Impossible de charger le profil.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const profile = payload?.profile;
  const events = Array.isArray(payload?.events) ? payload.events : [];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #f8fafc 0%, #fff 40%)",
        fontFamily: "system-ui, sans-serif",
        color: "#0f172a",
      }}
    >
      <LandingHeader />
      <main style={{ ...marketingContentShellStyle(), paddingTop: "2rem", paddingBottom: "3rem" }}>
        {loading ? <p>Chargement…</p> : null}
        {error ? (
          <div>
            <p style={{ color: "#b91c1c", fontWeight: 700 }}>{error}</p>
            <Link href="/">Retour à l’accueil</Link>
          </div>
        ) : null}
        {!loading && !error && profile ? (
          <>
            <header
              style={{
                display: "flex",
                gap: "1rem",
                alignItems: "flex-start",
                marginBottom: "1.5rem",
              }}
            >
              {profile.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.imageUrl}
                  alt=""
                  width={88}
                  height={88}
                  style={{
                    borderRadius: profile.type === "organization" ? 12 : "50%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 88,
                    height: 88,
                    borderRadius: profile.type === "organization" ? 12 : "50%",
                    background: "#e2e8f0",
                  }}
                />
              )}
              <div style={{ flex: 1 }}>
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
                  {profile.type === "organization" ? "Organisation" : "Particulier"}
                </p>
                <h1 style={{ margin: "0.2rem 0 0.45rem", fontSize: "1.75rem" }}>
                  {profile.displayName}
                </h1>
                {profile.bio ? (
                  <p style={{ margin: "0 0 0.55rem", color: "#334155", lineHeight: 1.5 }}>
                    {profile.bio}
                  </p>
                ) : null}
                {profile.websiteUrl ? (
                  <p style={{ margin: "0 0 0.65rem" }}>
                    <a
                      href={profile.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#1d4ed8", fontWeight: 700 }}
                    >
                      Site internet
                    </a>
                  </p>
                ) : null}
                <button
                  type="button"
                  disabled
                  title="Bientôt disponible"
                  style={{
                    padding: "0.45rem 0.85rem",
                    borderRadius: 10,
                    border: "1px solid #cbd5e1",
                    background: "#f1f5f9",
                    color: "#94a3b8",
                    fontWeight: 800,
                    cursor: "not-allowed",
                  }}
                  data-avote-follow-ready="false"
                >
                  Suivre (bientôt)
                </button>
              </div>
            </header>

            <section>
              <h2 style={{ fontSize: "1.1rem", margin: "0 0 0.75rem" }}>
                Événements publics
              </h2>
              {events.length === 0 ? (
                <p style={{ color: "#64748b" }}>Aucun événement public pour le moment.</p>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {events.map((ev) => (
                    <li
                      key={ev.id}
                      style={{
                        borderTop: "1px solid #e2e8f0",
                        padding: "0.85rem 0",
                      }}
                    >
                      <p style={{ margin: 0, fontWeight: 800 }}>{ev.title}</p>
                      <p style={{ margin: "0.25rem 0 0.45rem", color: "#64748b", fontSize: "0.86rem" }}>
                        {[ev.city, ev.startsAt ? new Date(ev.startsAt).toLocaleString("fr-FR") : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
                        <Link href={ev.joinPath} style={linkBtn}>
                          Rejoindre
                        </Link>
                        {ev.landingPath ? (
                          <Link href={ev.landingPath} style={linkBtnSecondary}>
                            Landing
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}

const linkBtn = {
  display: "inline-flex",
  padding: "0.4rem 0.7rem",
  borderRadius: 8,
  background: "#1d4ed8",
  color: "#fff",
  fontWeight: 700,
  fontSize: "0.84rem",
  textDecoration: "none",
};

const linkBtnSecondary = {
  ...linkBtn,
  background: "#fff",
  color: "#1d4ed8",
  border: "1px solid #bfdbfe",
};
