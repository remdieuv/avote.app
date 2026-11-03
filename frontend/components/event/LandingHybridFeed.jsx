"use client";

import { resolveApiAssetUrlNullable } from "@/lib/assetUrl";

/**
 * Fil chronologique Landing hybride — photos Moments, résultats, messages orga.
 */

function CameraIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 7l1.2-1.8A1.5 1.5 0 0111.4 4.5h1.2a1.5 1.5 0 011.2.7L15 7h3.5A2.5 2.5 0 0121 9.5v8A2.5 2.5 0 0118.5 20h-13A2.5 2.5 0 013 17.5v-8A2.5 2.5 0 015.5 7H9z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.25" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function HeartIcon({ filled, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 20.5s-7.2-4.35-9.3-8.1C1.2 9.7 2.1 6.6 5 5.5c1.85-.7 3.85-.1 5 1.35 1.15-1.45 3.15-2.05 5-1.35 2.9 1.1 3.8 4.2 2.3 6.9C19.2 16.15 12 20.5 12 20.5z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * @param {{
 *   accent: string;
 *   items: Array<Record<string, unknown>>;
 *   onToggleLike?: (photoId: string, liked: boolean) => void;
 *   likeBusyId?: string | null;
 *   canManage?: boolean;
 *   onDeletePhoto?: (photoId: string) => void;
 *   deletingPhotoId?: string | null;
 *   headerAction?: import("react").ReactNode;
 *   emptyHint?: string | null;
 * }} props
 */
export function LandingHybridFeed({
  accent,
  items,
  onToggleLike,
  likeBusyId = null,
  canManage = false,
  onDeletePhoto,
  deletingPhotoId = null,
  headerAction = null,
  emptyHint = null,
}) {
  const hasItems = Array.isArray(items) && items.length > 0;
  if (!hasItems && !headerAction && !emptyHint) return null;

  return (
    <section
      className="ev-landing-gallery-section"
      style={{
        marginBottom: "clamp(2rem, 5vw, 3rem)",
        "--ev-accent": accent,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "1.15rem",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "0.68rem",
              fontWeight: 800,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            Journal
          </p>
          <h2
            style={{
              margin: "0.35rem 0 0",
              fontSize: "clamp(1.45rem, 4vw, 1.85rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "#0f172a",
              lineHeight: 1.15,
            }}
          >
            Fil de l&apos;événement
          </h2>
          <p
            style={{
              margin: "0.4rem 0 0",
              fontSize: "0.95rem",
              color: "#64748b",
              maxWidth: "32rem",
              lineHeight: 1.45,
            }}
          >
            Photos, messages et résultats — du plus récent au plus ancien.
          </p>
        </div>
        {headerAction}
      </div>

      {emptyHint && !hasItems ? (
        <p
          style={{
            margin: "0 0 1rem",
            fontSize: "0.95rem",
            color: "#64748b",
            lineHeight: 1.5,
          }}
        >
          {emptyHint}
        </p>
      ) : null}

      {hasItems ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {items.map((item) => {
            const type = String(item?.type || "");
            const key = String(item?.id || Math.random());
            if (type === "photo" && item.photo) {
              return (
                <FeedPhotoCard
                  key={key}
                  photo={item.photo}
                  accent={accent}
                  busy={likeBusyId === String(item.photo.id)}
                  onToggleLike={onToggleLike}
                  canManage={canManage}
                  onDeletePhoto={onDeletePhoto}
                  isDeleting={deletingPhotoId === String(item.photo.id)}
                />
              );
            }
            if (type === "message" && item.message) {
              return (
                <FeedMessageCard
                  key={key}
                  message={item.message}
                  accent={accent}
                />
              );
            }
            if (type === "result" && item.result) {
              return (
                <FeedResultCard key={key} result={item.result} accent={accent} />
              );
            }
            return null;
          })}
        </div>
      ) : null}
    </section>
  );
}

function FeedCardShell({ children, eyebrow }) {
  return (
    <article
      style={{
        borderRadius: "20px",
        border: "1px solid rgba(15,23,42,0.06)",
        background: "#fff",
        boxShadow: "0 12px 36px rgba(15,23,42,0.06)",
        overflow: "hidden",
      }}
    >
      {eyebrow ? (
        <p
          style={{
            margin: 0,
            padding: "0.75rem 1rem 0",
            fontSize: "0.65rem",
            fontWeight: 800,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#94a3b8",
          }}
        >
          {eyebrow}
        </p>
      ) : null}
      {children}
    </article>
  );
}

function FeedPhotoCard({
  photo,
  accent,
  busy,
  onToggleLike,
  canManage,
  onDeletePhoto,
  isDeleting,
}) {
  const raw = typeof photo?.url === "string" ? photo.url : "";
  const url = resolveApiAssetUrlNullable(raw.trim()) || raw;
  const id = String(photo?.id || "");
  const liked = Boolean(photo?.likedByMe);
  const count = Number(photo?.likeCount || 0);
  if (!url) return null;
  return (
    <FeedCardShell eyebrow="Moment">
      <div style={{ position: "relative" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt=""
          loading="lazy"
          style={{
            display: "block",
            width: "100%",
            maxHeight: "min(70vw, 420px)",
            objectFit: "cover",
            background: "#e2e8f0",
          }}
        />
        {canManage && onDeletePhoto ? (
          <button
            type="button"
            className="ev-gallery-delete-btn"
            disabled={isDeleting}
            aria-label="Supprimer cette photo"
            onClick={() => onDeletePhoto(id)}
            style={{
              position: "absolute",
              top: "0.75rem",
              right: "0.75rem",
              zIndex: 2,
            }}
          >
            {isDeleting ? "…" : "✕"}
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy || !onToggleLike}
          onClick={() => onToggleLike?.(id, liked)}
          aria-label={liked ? "Retirer le like" : "Aimer cette photo"}
          aria-pressed={liked}
          style={{
            position: "absolute",
            right: "0.85rem",
            bottom: "0.85rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.45rem 0.75rem",
            borderRadius: "999px",
            border: "none",
            cursor: busy ? "wait" : "pointer",
            fontWeight: 700,
            fontSize: "0.88rem",
            color: liked ? "#fff" : "#0f172a",
            background: liked
              ? `linear-gradient(180deg, ${accent}, color-mix(in srgb, ${accent} 78%, #000))`
              : "rgba(255,255,255,0.92)",
            boxShadow: "0 8px 24px rgba(15,23,42,0.22)",
            backdropFilter: "blur(8px)",
          }}
        >
          <HeartIcon filled={liked} />
          <span>{count}</span>
        </button>
      </div>
    </FeedCardShell>
  );
}

function FeedMessageCard({ message, accent }) {
  const body = typeof message?.body === "string" ? message.body : "";
  if (!body) return null;
  return (
    <FeedCardShell eyebrow="Organisateur">
      <div style={{ padding: "0.65rem 1.1rem 1.15rem" }}>
        <p
          style={{
            margin: 0,
            fontSize: "1.05rem",
            lineHeight: 1.55,
            color: "#0f172a",
            whiteSpace: "pre-wrap",
            borderLeft: `3px solid ${accent}`,
            paddingLeft: "0.85rem",
          }}
        >
          {body}
        </p>
      </div>
    </FeedCardShell>
  );
}

function FeedResultCard({ result, accent }) {
  const question =
    typeof result?.question === "string" ? result.question : "Question";
  const options = Array.isArray(result?.options) ? result.options : [];
  const maxVotes = Math.max(1, ...options.map((o) => Number(o?.votes || 0)));
  const winners = Array.isArray(result?.contestWinners)
    ? result.contestWinners
    : [];
  return (
    <FeedCardShell eyebrow="Résultat">
      <div style={{ padding: "0.55rem 1.1rem 1.2rem" }}>
        <h3
          style={{
            margin: "0 0 0.85rem",
            fontSize: "1.08rem",
            fontWeight: 750,
            letterSpacing: "-0.02em",
            color: "#0f172a",
            lineHeight: 1.3,
          }}
        >
          {question}
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
          {options.map((opt) => {
            const votes = Number(opt?.votes || 0);
            const pct = Math.round((votes / maxVotes) * 100);
            return (
              <div key={String(opt?.id || opt?.label)}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                    fontSize: "0.9rem",
                    marginBottom: "0.25rem",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>
                    {opt?.label}
                    {opt?.isCorrect ? " ✓" : ""}
                  </span>
                  <span style={{ color: "#64748b", fontVariantNumeric: "tabular-nums" }}>
                    {votes}
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    borderRadius: 999,
                    background: "#e2e8f0",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: accent,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {winners.length > 0 ? (
          <p
            style={{
              margin: "0.9rem 0 0",
              fontSize: "0.9rem",
              color: "#475569",
            }}
          >
            Gagnant{winners.length > 1 ? "s" : ""} :{" "}
            {winners
              .map((w) => w?.displayName)
              .filter(Boolean)
              .join(", ")}
          </p>
        ) : null}
      </div>
    </FeedCardShell>
  );
}

export { CameraIcon, HeartIcon };
