"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import { marketingContentShellStyle } from "@/lib/marketingLayout";

/**
 * Lot D/E — page publique organisateur + Suivre.
 */
export default function OrganizerPublicPage() {
  const params = useParams();
  const router = useRouter();
  const slugParam = params?.slug;
  const slug =
    typeof slugParam === "string" ? slugParam : slugParam?.[0] ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {string|null} */ (null));
  const [payload, setPayload] = useState(/** @type {null | Record<string, any>} */ (null));
  const [isAuthed, setIsAuthed] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFetch(`${apiBaseBrowser()}/auth/me`, {
          cache: "no-store",
        });
        if (!cancelled) setIsAuthed(res.ok);
      } catch {
        if (!cancelled) setIsAuthed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const toggleFollow = useCallback(async () => {
    if (!slug) return;
    const loginNext = `/organizers/${encodeURIComponent(slug)}`;
    if (!isAuthed) {
      router.push(`/login?next=${encodeURIComponent(loginNext)}`);
      return;
    }
    const currently = Boolean(payload?.profile?.isFollowing);
    setFollowBusy(true);
    setPayload((prev) =>
      prev?.profile
        ? {
            ...prev,
            profile: { ...prev.profile, isFollowing: !currently },
          }
        : prev,
    );
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/organizers/${encodeURIComponent(slug)}/follow`,
        { method: currently ? "DELETE" : "POST" },
      );
      if (res.status === 401) {
        setIsAuthed(false);
        setPayload((prev) =>
          prev?.profile
            ? {
                ...prev,
                profile: { ...prev.profile, isFollowing: currently },
              }
            : prev,
        );
        router.push(`/login?next=${encodeURIComponent(loginNext)}`);
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || `Erreur ${res.status}`);
      }
      setPayload((prev) =>
        prev?.profile
          ? {
              ...prev,
              profile: {
                ...prev.profile,
                isFollowing: Boolean(body?.isFollowing),
              },
            }
          : prev,
      );
    } catch (e) {
      setPayload((prev) =>
        prev?.profile
          ? {
              ...prev,
              profile: { ...prev.profile, isFollowing: currently },
            }
          : prev,
      );
      setError(e?.message || "Impossible de mettre à jour le suivi.");
    } finally {
      setFollowBusy(false);
    }
  }, [isAuthed, payload?.profile?.isFollowing, router, slug]);

  const profile = payload?.profile;
  const events = Array.isArray(payload?.events) ? payload.events : [];
  const isFollowing = Boolean(profile?.isFollowing);
  const followReady = profile?.followAvailable !== false;

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
                {followReady ? (
                  <button
                    type="button"
                    onClick={() => void toggleFollow()}
                    disabled={followBusy}
                    aria-pressed={isFollowing}
                    style={{
                      padding: "0.5rem 0.95rem",
                      borderRadius: 10,
                      border: isFollowing ? "1px solid #cbd5e1" : "1px solid #1d4ed8",
                      background: isFollowing ? "#fff" : "#1d4ed8",
                      color: isFollowing ? "#0f172a" : "#fff",
                      fontWeight: 800,
                      cursor: followBusy ? "wait" : "pointer",
                      minHeight: 42,
                    }}
                    data-avote-follow-ready="true"
                  >
                    {followBusy
                      ? "…"
                      : isFollowing
                        ? "Ne plus suivre"
                        : "Suivre"}
                  </button>
                ) : null}
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
