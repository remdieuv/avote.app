"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminContentShellStyle } from "@/lib/adminLayout";
import { adminFetch, apiBaseBrowser } from "@/lib/config";

/**
 * Lot E — Organisateurs suivis (accès depuis Mon compte).
 */
export default function AdminFollowingPage() {
  const [rows, setRows] = useState(/** @type {Array<Record<string, any>>} */ ([]));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(/** @type {string|null} */ (null));
  const [busyId, setBusyId] = useState(/** @type {string|null} */ (null));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`${apiBaseBrowser()}/me/following`, {
        cache: "no-store",
      });
      if (res.status === 401) {
        setRows([]);
        setError("Session expirée ou non connecté.");
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || `Erreur ${res.status}`);
      }
      setRows(Array.isArray(body.following) ? body.following : []);
    } catch (e) {
      setRows([]);
      setError(e?.message || "Impossible de charger les organisateurs suivis.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function unfollow(row) {
    const slug = row?.organizer?.slug;
    const id = row?.organizerProfileId;
    if (!slug || !id) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await adminFetch(
        `${apiBaseBrowser()}/organizers/${encodeURIComponent(slug)}/follow`,
        { method: "DELETE" },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || `Erreur ${res.status}`);
      }
      setRows((prev) => prev.filter((r) => r.organizerProfileId !== id));
    } catch (e) {
      setError(e?.message || "Impossible de ne plus suivre.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        fontFamily: 'system-ui, "Segoe UI", sans-serif',
        background: "linear-gradient(180deg, #f1f5f9 0%, #f8fafc 32%, #fff 100%)",
      }}
    >
      <div style={adminContentShellStyle("workspace")}>
        <AdminPageHeader
          title="Organisateurs suivis"
          subtitle="Retrouvez les profils publics que vous suivez. Aucune notification automatique."
          breadcrumbs={
            <Link
              href="/admin/account"
              style={{
                color: "#64748b",
                fontWeight: 600,
                textDecoration: "none",
                fontSize: "0.88rem",
              }}
            >
              ← Mon compte
            </Link>
          }
        />

        {error ? (
          <p
            role="alert"
            style={{
              margin: "0 0 1rem",
              padding: "0.7rem 0.95rem",
              borderRadius: 10,
              background: "#fff7ed",
              border: "1px solid #fed7aa",
              color: "#9a3412",
              fontWeight: 600,
            }}
          >
            {error}
          </p>
        ) : null}

        {loading ? <p style={{ color: "#64748b" }}>Chargement…</p> : null}

        {!loading && rows.length === 0 ? (
          <div
            style={{
              padding: "2rem 1.25rem",
              borderRadius: 14,
              border: "1px dashed #cbd5e1",
              background: "#f8fafc",
              textAlign: "center",
            }}
          >
            <p style={{ margin: "0 0 0.4rem", fontWeight: 850, color: "#0f172a" }}>
              Aucun organisateur suivi
            </p>
            <p style={{ margin: "0 0 1rem", color: "#64748b", lineHeight: 1.5 }}>
              Sur une page organisateur publique, utilisez « Suivre » pour l’ajouter ici.
            </p>
            <Link href="/discover" style={linkPrimary}>
              Parcourir les événements
            </Link>
          </div>
        ) : null}

        {!loading && rows.length > 0 ? (
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {rows.map((row) => {
              const org = row.organizer || {};
              const href = org.profilePath || (org.slug ? `/organizers/${org.slug}` : null);
              return (
                <li
                  key={row.organizerProfileId}
                  style={{
                    display: "flex",
                    gap: "0.85rem",
                    alignItems: "center",
                    padding: "0.9rem 0",
                    borderTop: "1px solid #e2e8f0",
                  }}
                >
                  {org.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={org.imageUrl}
                      alt=""
                      width={52}
                      height={52}
                      style={{
                        borderRadius: org.type === "organization" ? 10 : "50%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: org.type === "organization" ? 10 : "50%",
                        background: "#e2e8f0",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 850 }}>
                      {href ? (
                        <Link
                          href={href}
                          style={{ color: "#0f172a", textDecoration: "none" }}
                        >
                          {org.displayName || "Organisateur"}
                        </Link>
                      ) : (
                        org.displayName || "Organisateur"
                      )}
                    </p>
                    {org.bio ? (
                      <p
                        style={{
                          margin: "0.2rem 0 0",
                          color: "#64748b",
                          fontSize: "0.86rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {org.bio}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={busyId === row.organizerProfileId}
                    onClick={() => void unfollow(row)}
                    style={{
                      padding: "0.45rem 0.75rem",
                      borderRadius: 9,
                      border: "1px solid #cbd5e1",
                      background: "#fff",
                      fontWeight: 750,
                      cursor:
                        busyId === row.organizerProfileId ? "wait" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Ne plus suivre
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </main>
  );
}

const linkPrimary = {
  display: "inline-flex",
  padding: "0.55rem 0.95rem",
  borderRadius: 10,
  background: "#1d4ed8",
  color: "#fff",
  fontWeight: 800,
  textDecoration: "none",
};
