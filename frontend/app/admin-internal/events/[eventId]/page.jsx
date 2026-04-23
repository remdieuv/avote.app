"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { adminFetch, apiBaseBrowser } from "@/lib/config";
import { EmptyState, TableWrap } from "@/components/internal-admin/InternalAdminUi";

function fmtDate(x) {
  try {
    return new Date(x).toLocaleString("fr-FR");
  } catch {
    return "-";
  }
}

export default function AdminInternalEventDetailsPage() {
  const params = useParams();
  const raw = params?.eventId;
  const eventId = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : null;
  const [eventData, setEventData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) {
      setError("Événement introuvable.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await adminFetch(
          `${apiBaseBrowser()}/internal/events/${encodeURIComponent(eventId)}`,
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || `Erreur ${res.status}`);
        if (!cancelled) setEventData(body?.event ?? null);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Erreur de chargement");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const polls = useMemo(
    () => (Array.isArray(eventData?.polls) ? eventData.polls : []),
    [eventData],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <p style={{ margin: 0, fontSize: "0.88rem" }}>
        <Link href="/admin-internal/events" style={{ color: "#64748b", fontWeight: 600, textDecoration: "none" }}>
          ← Événements (globaux)
        </Link>
      </p>

      {error ? <p style={{ margin: 0, color: "#b91c1c" }}>{error}</p> : null}

      {loading ? (
        <EmptyState text="Chargement de l’événement…" />
      ) : eventData ? (
        <>
          <section
            style={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "0.9rem 1rem",
              display: "grid",
              gap: "0.65rem",
            }}
          >
            <h1 style={{ margin: 0, fontSize: "1.35rem", color: "#0f172a" }}>
              {eventData.title || "Événement"}
            </h1>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "#64748b" }}>
              ID: <strong style={{ color: "#334155" }}>{eventData.id}</strong>
            </p>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "#64748b" }}>
              Propriétaire: <strong style={{ color: "#334155" }}>{eventData.ownerEmail}</strong>
            </p>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
                fontSize: "0.8rem",
              }}
            >
              <Badge label={`Statut ${eventData.status || "-"}`} />
              <Badge label={`Live ${eventData.liveState || "-"}`} />
              <Badge label={`Vote ${eventData.voteState || "-"}`} />
              <Badge label={`Affichage ${eventData.displayState || "-"}`} />
              <Badge label={`${eventData.pollCount || 0} question(s)`} />
              <Badge label={`${eventData.leadCount || 0} lead(s)`} />
            </div>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8" }}>
              Créé le {fmtDate(eventData.createdAt)} · Modifié le {fmtDate(eventData.updatedAt)}
            </p>
          </section>

          <TableWrap>
            {polls.length === 0 ? (
              <EmptyState text="Aucune question sur cet événement." />
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "760px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["#", "Question", "Statut", "Votes"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "0.62rem",
                          borderBottom: "1px solid #e2e8f0",
                          fontSize: "0.78rem",
                          color: "#475569",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {polls.map((p, idx) => (
                    <tr key={p.id}>
                      <td style={tdStyle}>{typeof p.order === "number" ? p.order + 1 : idx + 1}</td>
                      <td style={{ ...tdStyle, maxWidth: "42rem" }}>{p.label}</td>
                      <td style={tdStyle}>{p.status || "-"}</td>
                      <td style={tdStyle}>{p.voteCount || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TableWrap>
        </>
      ) : (
        <EmptyState text="Événement introuvable." />
      )}
    </div>
  );
}

function Badge({ label }) {
  return (
    <span
      style={{
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
        borderRadius: "9999px",
        padding: "0.22rem 0.5rem",
        color: "#334155",
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}

const tdStyle = {
  padding: "0.62rem",
  borderBottom: "1px solid #f1f5f9",
  fontSize: "0.86rem",
  color: "#0f172a",
};
