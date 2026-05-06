"use client";

import Link from "next/link";

const fieldLabel = {
  display: "block",
  fontSize: "0.68rem",
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: "0.35rem",
};

const controlBase = {
  width: "100%",
  minHeight: "42px",
  padding: "0.58rem 0.7rem",
  fontSize: "0.88rem",
  fontWeight: 600,
  color: "#0f172a",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#fff",
  boxSizing: "border-box",
  minWidth: 0,
  outline: "none",
};

const createBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "44px",
  padding: "0.72rem 1.1rem",
  fontSize: "0.88rem",
  fontWeight: 800,
  borderRadius: "10px",
  textDecoration: "none",
  border: "1px solid #1e40af",
  background: "linear-gradient(180deg, #2563eb, #1d4ed8)",
  color: "#fff",
  boxShadow: "0 4px 16px rgba(37, 99, 235, 0.28)",
  boxSizing: "border-box",
  whiteSpace: "nowrap",
  width: "100%",
  textAlign: "center",
};

/**
 * @param {{
 *   searchValue: string;
 *   onSearchChange: (v: string) => void;
 *   statusValue: string;
 *   onStatusChange: (v: string) => void;
 *   sortValue: string;
 *   onSortChange: (v: string) => void;
 *   statusOptions: { value: string; label: string }[];
 *   sortOptions: { value: string; label: string }[];
 *   showCreate?: boolean;
 * }} props
 */
export function AdminEventsToolbar({
  searchValue,
  onSearchChange,
  statusValue,
  onStatusChange,
  sortValue,
  onSortChange,
  statusOptions,
  sortOptions,
  showCreate = true,
}) {
  return (
    <div className="admin-events-toolbar">
      <div className="admin-events-toolbar-search-wrap">
        <label htmlFor="admin-events-search" className="admin-events-toolbar-sr-only">
          Rechercher par nom ou identifiant (slug)
        </label>
        <input
          id="admin-events-search"
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher un événement…"
          autoComplete="off"
          style={{
            ...controlBase,
            padding: "0.62rem 0.85rem",
          }}
        />
      </div>

      <div className="admin-events-toolbar-filters">
        <div>
          <label htmlFor="admin-events-status" style={fieldLabel}>
            Statut
          </label>
          <select
            id="admin-events-status"
            value={statusValue}
            onChange={(e) => onStatusChange(e.target.value)}
            style={controlBase}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="admin-events-sort" style={fieldLabel}>
            Tri
          </label>
          <select
            id="admin-events-sort"
            value={sortValue}
            onChange={(e) => onSortChange(e.target.value)}
            style={controlBase}
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showCreate ? (
        <div className="admin-events-toolbar-create-wrap">
          <span style={{ ...fieldLabel, visibility: "hidden", marginBottom: "0.35rem" }} aria-hidden>
            .
          </span>
          <Link href="/admin" className="admin-events-toolbar-create" style={createBtnStyle}>
            + Créer un événement
          </Link>
        </div>
      ) : null}

      <style>{`
        .admin-events-toolbar {
          display: grid;
          gap: 14px;
          margin-bottom: 0.75rem;
          width: 100%;
          min-width: 0;
        }
        .admin-events-toolbar-search-wrap {
          min-width: 0;
        }
        .admin-events-toolbar-filters {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          min-width: 0;
        }
        .admin-events-toolbar-create-wrap {
          min-width: 0;
        }
        @media (min-width: 900px) {
          .admin-events-toolbar {
            grid-template-columns: minmax(0, 1fr) minmax(140px, 170px) minmax(155px, 190px) auto;
            align-items: end;
            gap: 14px 16px;
          }
          .admin-events-toolbar-filters {
            display: contents;
          }
          .admin-events-toolbar-create {
            width: auto !important;
            align-self: end;
          }
        }
        #admin-events-search:focus-visible,
        #admin-events-status:focus-visible,
        #admin-events-sort:focus-visible {
          border-color: #93c5fd;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
        }
        .admin-events-toolbar-create:hover {
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.32) !important;
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
