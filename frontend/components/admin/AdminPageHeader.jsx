"use client";

export function AdminPageHeader({
  eyebrow = "",
  title,
  subtitle = "",
  actions = null,
  breadcrumbs = null,
}) {
  return (
    <header className="admin-page-header">
      {breadcrumbs ? <div className="admin-page-header-breadcrumbs">{breadcrumbs}</div> : null}
      <div className="admin-page-header-top">
        <div className="admin-page-header-main">
          {eyebrow ? <p className="admin-page-header-eyebrow">{eyebrow}</p> : null}
          <h1 className="admin-page-header-title">{title}</h1>
          {subtitle ? <p className="admin-page-header-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="admin-page-header-actions">{actions}</div> : null}
      </div>
      <style>{`
        .admin-page-header {
          margin-bottom: clamp(1rem, 2vw, 1.5rem);
        }
        .admin-page-header-breadcrumbs {
          margin: 0 0 0.7rem;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem;
        }
        .admin-page-header-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.9rem;
          flex-wrap: wrap;
        }
        .admin-page-header-main {
          min-width: 0;
          flex: 1 1 420px;
        }
        .admin-page-header-eyebrow {
          margin: 0 0 0.3rem;
          font-size: 0.72rem;
          font-weight: 800;
          color: #64748b;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .admin-page-header-title {
          margin: 0;
          font-size: clamp(1.625rem, 3.2vw, 2.125rem);
          line-height: 1.1;
          font-weight: 820;
          letter-spacing: -0.03em;
          color: #0f172a;
        }
        .admin-page-header-subtitle {
          margin: 0.4rem 0 0;
          max-width: 64ch;
          color: #64748b;
          font-size: clamp(0.95rem, 2vw, 1rem);
          line-height: 1.45;
        }
        .admin-page-header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          justify-content: flex-end;
          margin-left: auto;
        }
        @media (max-width: 720px) {
          .admin-page-header-actions {
            width: 100%;
            justify-content: flex-start;
            margin-left: 0;
          }
        }
      `}</style>
    </header>
  );
}
