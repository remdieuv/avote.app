"use client";

export function StatsCard({ label, value }) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        padding: "0.85rem 1rem",
      }}
    >
      <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>{label}</p>
      <p style={{ margin: "0.25rem 0 0 0", fontSize: "1.35rem", color: "#0f172a", fontWeight: 800 }}>
        {value}
      </p>
    </section>
  );
}

export function TableWrap({ children }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        overflowX: "auto",
      }}
    >
      {children}
    </div>
  );
}

export function EmptyState({ text }) {
  return (
    <p style={{ margin: 0, padding: "1rem", color: "#64748b", fontSize: "0.9rem" }}>
      {text}
    </p>
  );
}
