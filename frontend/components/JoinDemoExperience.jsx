"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useMemo, useState } from "react";
import {
  buildJoinRoomShellStyle,
  createJoinRoomPalette,
  glassPanelStyle,
  joinRoomAccent,
  resolveJoinRoomIsDark,
} from "@/lib/joinRoomVisual";
import { ExperienceHeader } from "@/components/navigation/ExperienceHeader";

const QUESTION = "Quelle fonctionnalité préférez-vous ?";

const DEMO_OPTIONS = [
  { id: "qr", label: "QR code simple", pct: 45 },
  { id: "live", label: "Résultats en direct", pct: 30 },
  { id: "proj", label: "Projection écran", pct: 25 },
];

/** Hub /join/demo — démo interactive sans API. */
export function JoinDemoExperience() {
  const [prefersDark, setPrefersDark] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setPrefersDark(mq.matches);
    const fn = () => setPrefersDark(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);

  const isDark = resolveJoinRoomIsDark("auto", prefersDark);
  const accent = joinRoomAccent("#4f46e5");
  const palette = useMemo(
    () => createJoinRoomPalette(isDark, accent),
    [isDark, accent],
  );

  const shell = useMemo(
    () =>
      buildJoinRoomShellStyle({
        hasBackgroundImage: false,
        roomSolidColor: null,
        isDark,
        fg: palette.fg,
      }),
    [isDark, palette.fg],
  );

  const zoneMain = useMemo(
    () => ({
      flex: 1,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      padding: "clamp(1rem, 4vw, 2rem) clamp(1rem, 5vw, 2.5rem) 2rem",
      boxSizing: "border-box",
      gap: "1.25rem",
    }),
    [],
  );

  const panelBase = useMemo(
    () => glassPanelStyle({ palette, isDark, textAlign: "center" }),
    [palette, isDark],
  );

  const joinCtaGradient = useMemo(
    () =>
      `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 40%, ${isDark ? "#1e1b4b" : "#c7d2fe"}))`,
    [accent, isDark],
  );

  const [phase, setPhase] = useState(/** @type {"vote" | "results"} */ ("vote"));
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null));
  const [barsAnimated, setBarsAnimated] = useState(false);
  const [demoJoinUrl, setDemoJoinUrl] = useState("");

  useEffect(() => {
    setDemoJoinUrl(`${window.location.origin}/join/demo`);
  }, []);

  useEffect(() => {
    if (phase !== "results") {
      setBarsAnimated(false);
      return;
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setBarsAnimated(true));
    });
    return () => cancelAnimationFrame(id);
  }, [phase]);

  function confirmVote() {
    if (!selectedId) return;
    setPhase("results");
  }

  function replay() {
    setPhase("vote");
    setSelectedId(null);
    setBarsAnimated(false);
  }

  const badgeVote = {
    display: "inline-block",
    margin: 0,
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: accent,
  };

  return (
    <main style={shell}>
      <style>{`
        .join-demo-vote-grid {
          display: grid;
          gap: 1.25rem;
          width: 100%;
          max-width: 100%;
          align-items: start;
        }
        @media (min-width: 768px) {
          .join-demo-vote-grid {
            grid-template-columns: minmax(0, 1fr) auto;
          }
        }
        @media (max-width: 767px) {
          .join-demo-vote-main {
            order: 2;
          }
          .join-demo-qr-aside {
            order: 1;
            margin-bottom: 0.25rem;
          }
        }
      `}</style>
      <ExperienceHeader
        backHref="/"
        backLabel="← Accueil"
        title="Démo Avote"
        subtitle="Voici à quoi ressemble une session côté participant — sans compte ni installation."
        palette={palette}
        isDark={isDark}
      />

      <div style={zoneMain}>
        <div style={panelBase}>
          {phase === "vote" ? (
            <>
              <div className="join-demo-vote-grid">
                <div className="join-demo-vote-main" style={{ minWidth: 0 }}>
                  <p style={badgeVote}>Testez l’expérience participant</p>
                  <h2
                    style={{
                      margin: "0.65rem 0 0.5rem 0",
                      fontSize: "clamp(1.15rem, 3.8vw, 1.45rem)",
                      fontWeight: 800,
                      lineHeight: 1.35,
                      letterSpacing: "-0.02em",
                      color: palette.fg,
                    }}
                  >
                    {QUESTION}
                  </h2>
                  <p
                    style={{
                      margin: "0 0 1.1rem 0",
                      fontSize: "0.88rem",
                      color: palette.muted2,
                      fontWeight: 500,
                    }}
                  >
                    Votez pour voir les résultats en direct.
                  </p>
                  <ul
                    style={{
                      listStyle: "none",
                      margin: 0,
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.65rem",
                      textAlign: "left",
                    }}
                  >
                    {DEMO_OPTIONS.map((opt) => {
                      const on = selectedId === opt.id;
                      return (
                        <li key={opt.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedId(opt.id)}
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.65rem",
                              padding: "0.85rem 1rem",
                              borderRadius: "14px",
                              border: on
                                ? `2px solid ${accent}`
                                : `1px solid ${palette.cardBorder}`,
                              background: on
                                ? `color-mix(in srgb, ${accent} 14%, transparent)`
                                : isDark
                                  ? "rgba(15, 23, 42, 0.35)"
                                  : "rgba(255,255,255,0.65)",
                              cursor: "pointer",
                              boxSizing: "border-box",
                              color: palette.fg,
                              fontSize: "0.95rem",
                              fontWeight: 600,
                              textAlign: "left",
                              transition:
                                "border-color 0.15s, background 0.15s",
                            }}
                          >
                            <span
                              aria-hidden
                              style={{
                                width: "1.15rem",
                                height: "1.15rem",
                                borderRadius: "999px",
                                border: on
                                  ? `5px solid ${accent}`
                                  : `2px solid ${palette.muted}`,
                                flexShrink: 0,
                                boxSizing: "border-box",
                              }}
                            />
                            {opt.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <button
                    type="button"
                    onClick={confirmVote}
                    disabled={!selectedId}
                    style={{
                      marginTop: "1.25rem",
                      width: "100%",
                      maxWidth: "22rem",
                      padding: "0.85rem 1.2rem",
                      fontSize: "clamp(1rem, 3.2vw, 1.08rem)",
                      fontWeight: 800,
                      border: "none",
                      borderRadius: "14px",
                      background:
                        !selectedId
                          ? isDark
                            ? "rgba(148, 163, 184, 0.35)"
                            : "#94a3b8"
                          : joinCtaGradient,
                      color: "#fff",
                      cursor: !selectedId ? "not-allowed" : "pointer",
                      boxShadow:
                        !selectedId
                          ? "none"
                          : `0 8px 28px rgba(0, 0, 0, ${isDark ? 0.32 : 0.18})`,
                    }}
                  >
                    Valider mon choix
                  </button>
                  <p
                    style={{
                      margin: "1rem 0 0 0",
                      fontSize: "0.78rem",
                      color: palette.muted,
                      lineHeight: 1.45,
                    }}
                  >
                    Les participants rejoignent via QR code ou lien — comme
                    en vrai.
                  </p>
                </div>

                <aside
                  className="join-demo-qr-aside"
                  style={{
                    margin: "0 auto",
                    width: "100%",
                    maxWidth: "15.5rem",
                    padding: "1rem 1.1rem",
                    borderRadius: "16px",
                    border: `1px solid ${palette.cardBorder}`,
                    background: isDark
                      ? "rgba(15, 23, 42, 0.5)"
                      : "rgba(255,255,255,0.88)",
                    boxSizing: "border-box",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 0.5rem 0",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: accent,
                    }}
                  >
                    Tester sur mobile
                  </p>
                  <p
                    style={{
                      margin: "0 0 0.85rem 0",
                      fontSize: "0.82rem",
                      color: palette.muted,
                      lineHeight: 1.45,
                    }}
                  >
                    Scannez ce code : vous ouvrez{' '}
                    <strong style={{ color: palette.fg2 }}>
                      la même démo
                    </strong>{' '}
                    pour voter depuis votre téléphone (fictif, sans compte).
                  </p>
                  <div
                    style={{
                      display: "inline-block",
                      padding: "0.5rem",
                      borderRadius: "12px",
                      background: "#fff",
                      lineHeight: 0,
                    }}
                  >
                    {demoJoinUrl ? (
                      <QRCodeSVG
                        value={demoJoinUrl}
                        size={148}
                        level="M"
                        includeMargin
                        title="Ouvrir la démo Avote sur mobile"
                        fgColor="#0f172a"
                        bgColor="#ffffff"
                      />
                    ) : (
                      <div
                        style={{
                          width: 148,
                          height: 148,
                          display: "grid",
                          placeItems: "center",
                          fontSize: "0.78rem",
                          color: "#94a3b8",
                        }}
                      >
                        …
                      </div>
                    )}
                  </div>
                  <p
                    style={{
                      margin: "0.65rem 0 0 0",
                      fontSize: "0.72rem",
                      color: palette.muted,
                      wordBreak: "break-all",
                      lineHeight: 1.35,
                    }}
                  >
                    {demoJoinUrl || "Chargement du lien…"}
                  </p>
                </aside>
              </div>
            </>
          ) : (
            <>
              <p
                style={{
                  margin: 0,
                  padding: "0.65rem 0.9rem",
                  borderRadius: "12px",
                  background: `color-mix(in srgb, ${accent} 16%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${accent} 35%, transparent)`,
                  color: palette.fg,
                  fontWeight: 600,
                  fontSize: "0.92rem",
                }}
              >
                Merci ! Vote pris en compte.
              </p>
              <p
                style={{
                  ...badgeVote,
                  marginTop: "1.15rem",
                }}
              >
                Résultats en direct
              </p>
              <p
                style={{
                  margin: "0.35rem 0 1rem 0",
                  fontSize: "0.82rem",
                  color: palette.muted,
                }}
              >
                Classement simulé — même rendu que lors d’un vrai événement.
              </p>
              <div style={{ textAlign: "left", width: "100%" }}>
                {DEMO_OPTIONS.map((opt) => (
                  <ResultBar
                    key={opt.id}
                    label={opt.label}
                    pct={opt.pct}
                    isMine={opt.id === selectedId}
                    accent={accent}
                    palette={palette}
                    isDark={isDark}
                    animated={barsAnimated}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={replay}
                style={{
                  marginTop: "0.85rem",
                  padding: "0.5rem 1rem",
                  fontSize: "0.84rem",
                  fontWeight: 600,
                  borderRadius: "10px",
                  border: `1px solid ${palette.cardBorder}`,
                  background: isDark
                    ? "rgba(15, 23, 42, 0.4)"
                    : "rgba(255,255,255,0.75)",
                  color: palette.fg2,
                  cursor: "pointer",
                }}
              >
                Rejouer la démo
              </button>
            </>
          )}
        </div>

        <div
          style={{
            ...glassPanelStyle({ palette, isDark, textAlign: "center" }),
            padding: "clamp(1rem, 3vw, 1.35rem) clamp(1rem, 4vw, 1.5rem)",
            maxWidth: "min(42rem, 100%)",
          }}
        >
          <p
            style={{
              margin: "0 0 0.85rem 0",
              fontSize: "0.95rem",
              fontWeight: 700,
              color: palette.fg,
            }}
          >
            Prêt à animer votre propre session ?
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.65rem",
              justifyContent: "center",
            }}
          >
            <Link
              href="/admin"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.65rem 1.25rem",
                fontSize: "0.92rem",
                fontWeight: 800,
                borderRadius: "12px",
                background: joinCtaGradient,
                color: "#fff",
                textDecoration: "none",
                boxShadow: `0 8px 24px rgba(0, 0, 0, ${isDark ? 0.28 : 0.15})`,
              }}
            >
              Créer mon événement
            </Link>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0.62rem 1.15rem",
                fontSize: "0.88rem",
                fontWeight: 600,
                borderRadius: "12px",
                border: `1px solid ${palette.cardBorder}`,
                color: palette.fg2,
                textDecoration: "none",
                background: isDark
                  ? "rgba(15, 23, 42, 0.35)"
                  : "rgba(255,255,255,0.7)",
              }}
            >
              Retour à l’accueil
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * @param {{
 *   label: string;
 *   pct: number;
 *   isMine: boolean;
 *   accent: string;
 *   palette: ReturnType<typeof createJoinRoomPalette>;
 *   isDark: boolean;
 *   animated: boolean;
 * }} props
 */
function ResultBar({ label, pct, isMine, accent, palette, isDark, animated }) {
  return (
    <div style={{ marginBottom: "1.05rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "0.75rem",
          marginBottom: "0.4rem",
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: "0.9rem",
            color: palette.fg,
          }}
        >
          {label}
          {isMine ? (
            <span
              style={{
                marginLeft: "0.35rem",
                fontSize: "0.72rem",
                fontWeight: 700,
                color: accent,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Votre choix
            </span>
          ) : null}
        </span>
        <span
          style={{
            fontSize: "0.88rem",
            fontWeight: 800,
            color: palette.muted2,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {pct}%
        </span>
      </div>
      <div
        style={{
          height: "11px",
          borderRadius: "999px",
          background: isDark
            ? "rgba(148, 163, 184, 0.22)"
            : "rgba(15, 23, 42, 0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: animated ? `${pct}%` : "0%",
            maxWidth: "100%",
            transition: "width 0.9s cubic-bezier(0.22, 1, 0.36, 1)",
            borderRadius: "999px",
            background: isMine
              ? joinBarGradient(accent, isDark)
              : `color-mix(in srgb, ${accent} 52%, ${isDark ? "#334155" : "#cbd5e1"})`,
          }}
        />
      </div>
    </div>
  );
}

function joinBarGradient(accent, isDark) {
  return `linear-gradient(90deg, ${accent}, color-mix(in srgb, ${accent} 65%, ${isDark ? "#6366f1" : "#818cf8"}))`;
}
