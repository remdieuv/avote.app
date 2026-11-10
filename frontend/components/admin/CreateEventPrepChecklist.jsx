"use client";

/**
 * Checklist discrète — informative, jamais bloquante.
 *
 * @param {{
 *   items?: Array<{ id: string; label: string; done: boolean; optional?: boolean }>;
 * }} props
 */
export function CreateEventPrepChecklist({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const doneCount = items.filter((i) => i.done).length;

  return (
    <section
      className="admin-side-card"
      data-testid="create-event-prep-checklist"
      aria-label="Préparation de l’événement"
    >
      <p className="admin-side-kicker">Préparation</p>
      <p
        style={{
          margin: "0 0 0.55rem",
          fontSize: "0.78rem",
          color: "#64748b",
          lineHeight: 1.4,
          fontWeight: 600,
        }}
      >
        Repères pour un premier événement ({doneCount}/{items.length}). Rien
        n’est bloqué ici.
      </p>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gap: "0.4rem",
        }}
      >
        {items.map((item) => (
          <li
            key={item.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.45rem",
              fontSize: "0.8rem",
              lineHeight: 1.35,
              color: item.done ? "#166534" : "#475569",
              fontWeight: item.done ? 700 : 600,
            }}
          >
            <span aria-hidden style={{ flexShrink: 0, marginTop: "0.05rem" }}>
              {item.done ? "✅" : item.optional ? "○" : "□"}
            </span>
            <span>
              {item.label}
              {item.optional ? (
                <span style={{ color: "#94a3b8", fontWeight: 600 }}>
                  {" "}
                  (après)
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
