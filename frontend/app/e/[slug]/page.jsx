"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { resolveApiAssetUrlNullable } from "@/lib/assetUrl";
import { API_URL } from "@/lib/config";

/**
 * Landing événement publique — vitrine + galerie + lien vers la salle live.
 */
export default function EventLandingPage() {
  const params = useParams();
  const router = useRouter();
  const slugParam = params?.slug;
  const slug =
    typeof slugParam === "string" ? slugParam : slugParam?.[0] ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  /** @type {null | import("react").CSSProperties} */
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    if (!slug) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      let redirected = false;
      try {
        const res = await fetch(
          `${API_URL}/events/slug/${encodeURIComponent(slug)}/landing`,
          { cache: "no-store" },
        );
        if (res.status === 404) {
          if (!cancelled) {
            setError("Événement introuvable.");
            setPayload(null);
          }
          return;
        }
        if (!res.ok) {
          if (!cancelled) setError(`Erreur ${res.status}`);
          return;
        }
        const data = await res.json();
        if (!cancelled && data?.enabled === false) {
          redirected = true;
          router.replace(`/join/${encodeURIComponent(slug)}`);
          return;
        }
        if (!cancelled) setPayload(data);
      } catch {
        if (!cancelled) setError("Impossible de charger la page.");
      } finally {
        if (!cancelled && !redirected) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, router]);

  const accent = useMemo(() => {
    const c = payload?.primaryColor;
    return typeof c === "string" && /^#[0-9A-Fa-f]{6}$/.test(c.trim())
      ? c.trim()
      : "#2563eb";
  }, [payload]);

  if (!slug) {
    return (
      <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
        <p>Lien invalide.</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#64748b",
        }}
      >
        Chargement…
      </main>
    );
  }

  if (error || !payload) {
    return (
      <main
        style={{
          minHeight: "100vh",
          padding: "2rem",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <p style={{ color: "#b91c1c" }}>{error || "Indisponible."}</p>
        <p style={{ marginTop: "1rem" }}>
          <Link href="/" style={{ color: "#2563eb", fontWeight: 600 }}>
            Accueil
          </Link>
        </p>
      </main>
    );
  }

  const title =
    typeof payload.title === "string" && payload.title.trim()
      ? payload.title.trim()
      : "Événement";
  const description =
    typeof payload.description === "string" && payload.description.trim()
      ? payload.description.trim()
      : null;
  const cover =
    typeof payload.coverUrl === "string"
      ? resolveApiAssetUrlNullable(payload.coverUrl.trim())
      : null;
  const logo =
    typeof payload.logoUrl === "string"
      ? resolveApiAssetUrlNullable(payload.logoUrl.trim())
      : null;
  const photos = Array.isArray(payload.photos) ? payload.photos : [];
  const joinHref =
    typeof payload.joinPath === "string" && payload.joinPath.startsWith("/")
      ? payload.joinPath
      : `/join/${encodeURIComponent(slug)}`;

  const infoTitle =
    typeof payload.infoSectionTitle === "string"
      ? payload.infoSectionTitle.trim()
      : "";
  const infoText =
    typeof payload.infoSectionText === "string"
      ? payload.infoSectionText.trim()
      : "";
  const ipL =
    typeof payload.infoPrimaryCtaLabel === "string"
      ? payload.infoPrimaryCtaLabel.trim()
      : "";
  const ipU =
    typeof payload.infoPrimaryCtaUrl === "string"
      ? payload.infoPrimaryCtaUrl.trim()
      : "";
  const isL =
    typeof payload.infoSecondaryCtaLabel === "string"
      ? payload.infoSecondaryCtaLabel.trim()
      : "";
  const isU =
    typeof payload.infoSecondaryCtaUrl === "string"
      ? payload.infoSecondaryCtaUrl.trim()
      : "";
  const showInfo =
    infoTitle ||
    infoText ||
    (ipL && ipU) ||
    (isL && isU);

  const mainBtn = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.85rem 1.35rem",
    borderRadius: "14px",
    border: "none",
    fontWeight: 800,
    fontSize: "1rem",
    cursor: "pointer",
    textDecoration: "none",
    color: "#fff",
    background: `linear-gradient(180deg, ${accent}, color-mix(in srgb, ${accent} 82%, #000))`,
    boxShadow: `0 14px 36px color-mix(in srgb, ${accent} 35%, transparent)`,
    boxSizing: "border-box",
    width: "100%",
    maxWidth: "22rem",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        fontFamily:
          'system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
        color: "#0f172a",
      }}
    >
      <style>{`
        .ev-landing-hero-img {
          width: 100%;
          height: min(52vh, 420px);
          object-fit: cover;
          display: block;
        }
        @media (min-width: 768px) {
          .ev-landing-hero-img { height: min(44vh, 480px); }
        }
        .ev-landing-gallery-scroll {
          display: flex;
          gap: 0.65rem;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          padding-bottom: 0.35rem;
          -webkit-overflow-scrolling: touch;
        }
        .ev-landing-gallery-scroll img {
          scroll-snap-align: start;
          flex: 0 0 min(88vw, 340px);
          width: min(88vw, 340px);
          height: min(52vw, 240px);
          object-fit: cover;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
        }
        @media (min-width: 768px) {
          .ev-landing-gallery-scroll { display: none; }
          .ev-landing-gallery-grid {
            display: grid !important;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 0.75rem;
          }
          .ev-landing-gallery-grid img {
            width: 100%;
            aspect-ratio: 1;
            object-fit: cover;
            border-radius: 14px;
            border: 1px solid #e2e8f0;
          }
        }
        .ev-landing-gallery-grid { display: none; }
      `}</style>

      <section style={{ position: "relative" }}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ev-landing-hero-img" src={cover} alt="" />
        ) : (
          <div
            className="ev-landing-hero-img"
            style={{
              background: `linear-gradient(145deg, color-mix(in srgb, ${accent} 22%, #f8fafc), #f1f5f9)`,
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(15,23,42,0.72) 0%, transparent 55%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "clamp(1.25rem, 4vw, 2rem)",
            maxWidth: "720px",
          }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt=""
              style={{
                width: "52px",
                height: "52px",
                objectFit: "contain",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.92)",
                padding: "6px",
                marginBottom: "0.65rem",
              }}
            />
          ) : null}
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(1.55rem, 5vw, 2.15rem)",
              fontWeight: 800,
              lineHeight: 1.2,
              color: "#fff",
              letterSpacing: "-0.03em",
              textShadow: "0 2px 24px rgba(0,0,0,0.35)",
            }}
          >
            {title}
          </h1>
          {description ? (
            <p
              style={{
                margin: "0.65rem 0 0",
                fontSize: "clamp(0.95rem, 2.8vw, 1.05rem)",
                lineHeight: 1.45,
                color: "rgba(248,250,252,0.92)",
                maxWidth: "36rem",
              }}
            >
              {description}
            </p>
          ) : null}
          <div style={{ marginTop: "1.25rem" }}>
            <Link href={joinHref} style={mainBtn}>
              Participer au live
            </Link>
          </div>
        </div>
      </section>

      <div
        style={{
          maxWidth: "920px",
          margin: "0 auto",
          padding: "clamp(1.25rem, 4vw, 2rem)",
          boxSizing: "border-box",
        }}
      >
        {photos.length > 0 ? (
          <section style={{ marginBottom: "clamp(1.5rem, 4vw, 2.25rem)" }}>
            <h2
              style={{
                margin: "0 0 0.65rem",
                fontSize: "0.72rem",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#64748b",
              }}
            >
              Galerie live
            </h2>
            <div className="ev-landing-gallery-scroll">
              {photos.map((p) => {
                const u =
                  typeof p?.url === "string"
                    ? resolveApiAssetUrlNullable(p.url.trim())
                    : null;
                if (!u) return null;
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.id} src={u} alt="" />
                );
              })}
            </div>
            <div className="ev-landing-gallery-grid">
              {photos.map((p) => {
                const u =
                  typeof p?.url === "string"
                    ? resolveApiAssetUrlNullable(p.url.trim())
                    : null;
                if (!u) return null;
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={`g-${p.id}`} src={u} alt="" />
                );
              })}
            </div>
          </section>
        ) : null}

        {showInfo ? (
          <section
            style={{
              marginBottom: "clamp(1.5rem, 4vw, 2.25rem)",
              padding: "1.15rem 1.2rem",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              background: "#fff",
              boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
            }}
          >
            <h2
              style={{
                margin: "0 0 0.45rem",
                fontSize: "0.72rem",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#64748b",
              }}
            >
              Infos pratiques
            </h2>
            {infoTitle ? (
              <p style={{ margin: 0, fontWeight: 800, fontSize: "1rem" }}>
                {infoTitle}
              </p>
            ) : null}
            {infoText ? (
              <p
                style={{
                  margin: infoTitle ? "0.45rem 0 0" : 0,
                  fontSize: "0.94rem",
                  lineHeight: 1.55,
                  color: "#475569",
                  whiteSpace: "pre-wrap",
                }}
              >
                {infoText}
              </p>
            ) : null}
            <div
              style={{
                marginTop: "0.75rem",
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              {ipL && ipU ? (
                <a
                  href={ipU}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    ...mainBtn,
                    width: "auto",
                    maxWidth: "none",
                    padding: "0.55rem 0.95rem",
                    fontSize: "0.88rem",
                  }}
                >
                  ↗ {ipL}
                </a>
              ) : null}
              {isL && isU ? (
                <a
                  href={isU}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0.55rem 0.95rem",
                    borderRadius: "12px",
                    border: `1px solid color-mix(in srgb, ${accent} 35%, #e2e8f0)`,
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    color: accent,
                    textDecoration: "none",
                    background: "#fff",
                  }}
                >
                  ↗ {isL}
                </a>
              ) : null}
            </div>
          </section>
        ) : null}

        <section
          style={{
            textAlign: "center",
            padding: "1.5rem 1rem 2.5rem",
          }}
        >
          <Link href={joinHref} style={mainBtn}>
            Rejoindre la salle live
          </Link>
          <p style={{ margin: "1rem 0 0", fontSize: "0.82rem", color: "#64748b" }}>
            Accès interactif : votes et animations en direct.
          </p>
        </section>
      </div>
    </main>
  );
}
