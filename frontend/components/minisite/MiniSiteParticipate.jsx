"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import { marketingContentMaxWidth } from "@/lib/marketingLayout";
import { resolveMiniSiteAccent } from "@/lib/miniSiteUi";
import { getOrCreateVoterSessionId } from "@/lib/votes/voter-session";
import { votedPollLocalStorageKey } from "@/lib/startRealResetClient";
import { isSelfServiceMode } from "@/lib/consultationMode";

/**
 * Onglet Participer — états + CTA vers /join et /p (pas d’iframe).
 * @param {{
 *   slug: string;
 *   landingPayload: Record<string, unknown>;
 * }} props
 */
export function MiniSiteParticipate({ slug, landingPayload }) {
  const accent = resolveMiniSiteAccent(
    typeof landingPayload.primaryColor === "string"
      ? landingPayload.primaryColor
      : null,
  );
  const joinHref =
    typeof landingPayload.joinPath === "string" &&
    landingPayload.joinPath.startsWith("/")
      ? landingPayload.joinPath
      : `/join/${encodeURIComponent(slug)}`;

  const publicStatus =
    landingPayload.publicStatus && typeof landingPayload.publicStatus === "object"
      ? /** @type {Record<string, unknown>} */ (landingPayload.publicStatus)
      : {};

  const [hub, setHub] = useState(/** @type {null | Record<string, unknown>} */ (null));
  const [hubError, setHubError] = useState(/** @type {string | null} */ (null));
  const [votedIds, setVotedIds] = useState(/** @type {Set<string>} */ (() => new Set()));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFetch(
          `${apiBaseBrowser()}/events/slug/${encodeURIComponent(slug)}`,
          { cache: "no-store" },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) {
            setHubError(
              typeof data?.error === "string" ? data.error : `Erreur ${res.status}`,
            );
          }
          return;
        }
        if (!cancelled) {
          setHub(data);
          setHubError(null);
        }
      } catch {
        if (!cancelled) setHubError("Impossible de charger l’état de participation.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    getOrCreateVoterSessionId();
    /** @type {string[]} */
    const ids = [];
    if (Array.isArray(hub?.catalogPolls)) {
      for (const p of hub.catalogPolls) {
        if (p?.id) ids.push(String(p.id));
      }
    }
    if (Array.isArray(hub?.pastPolls)) {
      for (const p of hub.pastPolls) {
        if (p?.id) ids.push(String(p.id));
      }
    }
    if (typeof hub?.activePollId === "string" && hub.activePollId.trim()) {
      ids.push(hub.activePollId.trim());
    }
    const next = new Set();
    for (const id of [...new Set(ids)]) {
      try {
        if (window.localStorage.getItem(votedPollLocalStorageKey(id))) {
          next.add(id);
        }
      } catch {
        /* ignore */
      }
    }
    setVotedIds(next);
  }, [hub]);

  const ssMode = isSelfServiceMode({
    consultationMode:
      hub?.consultationMode ?? landingPayload.consultationMode ?? "live",
  });

  const capacityFull =
    publicStatus.capacityFull === true ||
    hub?.limitReached === true ||
    (Number(hub?.participantsLimit) > 0 &&
      Number(hub?.participantsUsed) >= Number(hub?.participantsLimit));

  const finished =
    publicStatus.statusKey === "finished" ||
    String(hub?.liveState || "").toLowerCase() === "finished" ||
    hub?.isLocked === true;

  const catalog = useMemo(() => {
    if (!ssMode || !Array.isArray(hub?.catalogPolls)) return [];
    return hub.catalogPolls.filter((p) => p && p.id);
  }, [hub, ssMode]);

  const statusLabel =
    typeof publicStatus.statusLabel === "string"
      ? publicStatus.statusLabel
      : "Participation";
  const statusHint =
    typeof publicStatus.statusHint === "string"
      ? publicStatus.statusHint
      : capacityFull
        ? "La capacité maximale est atteinte temporairement — ce n’est pas une clôture définitive."
        : null;

  const primaryCtaLabel = finished
    ? "Retour à l’accueil"
    : capacityFull
      ? "Voir la salle"
      : ssMode
        ? Boolean(hub?.selfServiceOpen ?? landingPayload.selfServiceOpen)
          ? "Ouvrir la consultation"
          : "Voir les questions"
        : "Rejoindre la salle";

  const primaryHref = finished ? `/e/${encodeURIComponent(slug)}` : joinHref;

  return (
    <div
      style={{
        maxWidth: marketingContentMaxWidth(),
        margin: "0 auto",
        padding: "1.75rem clamp(1.15rem, 4vw, 2rem) 0",
        boxSizing: "border-box",
      }}
    >
      <header style={{ marginBottom: "1.35rem" }}>
        <p
          style={{
            margin: 0,
            fontSize: "0.72rem",
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#94a3b8",
          }}
        >
          Participer
        </p>
        <h1
          style={{
            margin: "0.4rem 0 0",
            fontSize: "clamp(1.45rem, 4vw, 1.95rem)",
            letterSpacing: "-0.03em",
            fontWeight: 780,
          }}
        >
          {statusLabel}
        </h1>
        {statusHint ? (
          <p
            style={{
              margin: "0.55rem 0 0",
              color: "#64748b",
              lineHeight: 1.5,
              maxWidth: "36rem",
            }}
          >
            {statusHint}
          </p>
        ) : (
          <p
            style={{
              margin: "0.55rem 0 0",
              color: "#64748b",
              lineHeight: 1.5,
              maxWidth: "36rem",
            }}
          >
            {ssMode
              ? "Répondez à votre rythme aux questions proposées. Vous serez redirigé vers la consultation existante."
              : "Rejoignez la salle interactive pour voter en direct. Aucun nouveau moteur de vote."}
          </p>
        )}
      </header>

      {hubError ? (
        <p style={{ color: "#b91c1c", fontSize: "0.92rem" }}>{hubError}</p>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
        <Link
          href={primaryHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "0.9rem 1.35rem",
            borderRadius: "999px",
            background: accent,
            color: "#fff",
            fontWeight: 750,
            textDecoration: "none",
          }}
        >
          {primaryCtaLabel}
        </Link>
        {!finished ? (
          <Link
            href={`/e/${encodeURIComponent(slug)}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.85rem 1.15rem",
              borderRadius: "999px",
              border: "1px solid #e2e8f0",
              background: "#fff",
              color: "#334155",
              fontWeight: 650,
              textDecoration: "none",
            }}
          >
            Retour à l’accueil
          </Link>
        ) : null}
      </div>

      {ssMode && catalog.length > 0 ? (
        <section style={{ marginTop: "1.75rem" }}>
          <h2
            style={{
              margin: "0 0 0.75rem",
              fontSize: "0.78rem",
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#94a3b8",
            }}
          >
            Questions proposées
          </h2>
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "grid",
              gap: "0.65rem",
            }}
          >
            {catalog.map((p) => {
              const id = String(p.id);
              const label =
                (typeof p.label === "string" && p.label.trim()) ||
                "Question";
              const answered = votedIds.has(id);
              const open = p.open === true || p.votable === true;
              const href = `/p/${encodeURIComponent(slug)}?poll=${encodeURIComponent(id)}`;
              return (
                <li key={id}>
                  <Link
                    href={href}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      alignItems: "center",
                      padding: "0.95rem 1.05rem",
                      borderRadius: "14px",
                      background: "#fff",
                      border: "1px solid rgba(15,23,42,0.07)",
                      textDecoration: "none",
                      color: "#0f172a",
                    }}
                  >
                    <span style={{ fontWeight: 650, lineHeight: 1.35 }}>
                      {label}
                    </span>
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: answered
                          ? accent
                          : open
                            ? "#15803d"
                            : "#94a3b8",
                      }}
                    >
                      {answered
                        ? "Déjà répondu"
                        : open
                          ? "Ouverte"
                          : "Lecture"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {!ssMode && !finished ? (
        <p
          style={{
            marginTop: "1.5rem",
            fontSize: "0.9rem",
            color: "#64748b",
            lineHeight: 1.5,
          }}
        >
          En mode Live animé, les questions sont pilotées depuis la salle. Le
          QR et le lien de participation directe restent inchangés.
        </p>
      ) : null}
    </div>
  );
}
