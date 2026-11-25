"use client";

/**
 * Catalogue libre-service dans `/join`.
 * @param {{
 *   eventTitle?: string | null;
 *   consultationOpen: boolean;
 *   catalogPolls: Array<{
 *     id: string;
 *     label: string;
 *     type?: string;
 *     open?: boolean;
 *     votable?: boolean;
 *   }>;
 *   votedPollIds: Set<string> | Record<string, boolean>;
 *   slug?: string;
 *   accent?: string;
 *   onSelectPoll?: (pollId: string) => void;
 *   selectedPollId?: string | null;
 * }} props
 */
export function SelfServiceJoinCatalog({
  eventTitle,
  consultationOpen,
  catalogPolls,
  votedPollIds,
  slug: _slug,
  accent = "#2563eb",
  onSelectPoll,
  selectedPollId = null,
}) {
  const votedSet =
    votedPollIds instanceof Set
      ? votedPollIds
      : new Set(
          Object.entries(votedPollIds || {})
            .filter(([, v]) => Boolean(v))
            .map(([k]) => k),
        );

  const openPolls = (catalogPolls || []).filter((p) => p.open || p.votable);
  const closedPolls = (catalogPolls || []).filter((p) => !(p.open || p.votable));

  return (
    <div style={{ width: "100%", maxWidth: "36rem", margin: "0 auto" }}>
      {eventTitle ? (
        <h1
          style={{
            margin: "0 0 0.75rem",
            fontSize: "clamp(1.35rem, 4vw, 1.75rem)",
            fontWeight: 800,
            color: "#0f172a",
            letterSpacing: "-0.02em",
            textAlign: "center",
          }}
        >
          {eventTitle}
        </h1>
      ) : null}

      {!consultationOpen ? (
        <div
          role="status"
          style={{
            margin: "1rem 0",
            padding: "1.1rem 1.15rem",
            borderRadius: "14px",
            border: "1px solid #e2e8f0",
            background: "#f8fafc",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontWeight: 700, color: "#0f172a" }}>
            Consultation en pause
          </p>
          <p
            style={{
              margin: "0.45rem 0 0",
              fontSize: "0.92rem",
              color: "#64748b",
              lineHeight: 1.45,
            }}
          >
            Les votes sont temporairement fermés. Vous pouvez consulter les
            résultats actuels des questions déjà répondues.
          </p>
        </div>
      ) : (
        <p
          style={{
            margin: "0 0 1rem",
            textAlign: "center",
            color: "#64748b",
            fontSize: "0.95rem",
            lineHeight: 1.45,
          }}
        >
          Choisissez une question — répondez à votre rythme.
        </p>
      )}

      {openPolls.length > 0 ? (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.65rem",
          }}
        >
          {openPolls.map((p) => {
            const done = votedSet.has(p.id);
            const selected = selectedPollId === p.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelectPoll?.(p.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "0.95rem 1rem",
                    borderRadius: "12px",
                    border: selected
                      ? `2px solid ${accent}`
                      : "1px solid #cbd5e1",
                    background: selected ? "#eff6ff" : "#fff",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontWeight: 700,
                      color: "#0f172a",
                      fontSize: "0.98rem",
                      lineHeight: 1.35,
                    }}
                  >
                    {p.label}
                  </span>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: "0.4rem",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: done ? "#166534" : accent,
                    }}
                  >
                    {done ? "Répondu" : "À répondre"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : consultationOpen ? (
        <p
          style={{
            margin: "1rem 0",
            textAlign: "center",
            color: "#64748b",
            fontSize: "0.92rem",
          }}
        >
          Aucune question ouverte pour l’instant.
        </p>
      ) : null}

      {closedPolls.length > 0 ? (
        <div style={{ marginTop: "1.75rem" }}>
          <p
            style={{
              margin: "0 0 0.55rem",
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Autres questions
          </p>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {closedPolls.map((p) => (
              <li key={p.id} style={{ marginBottom: "0.45rem" }}>
                <button
                  type="button"
                  onClick={() => onSelectPoll?.(p.id)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "0.7rem 0.85rem",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    color: "#334155",
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    cursor: "pointer",
                  }}
                >
                  {p.label}
                  <span
                    style={{
                      display: "block",
                      marginTop: "0.2rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "#94a3b8",
                    }}
                  >
                    {votedSet.has(p.id) ? "Répondu · résultats" : "Résultats"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
