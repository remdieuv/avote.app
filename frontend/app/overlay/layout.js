/** Fond transparent pour capture navigateur / OBS sur cette arborescence uniquement */
export default function OverlayLayout({ children }) {
  return (
    <>
      <style>{`
        /* Priorité sur globals.css (--background blanc) — critique OBS Browser Source */
        html:has(.avote-overlay-root),
        body:has(.avote-overlay-root) {
          background: transparent !important;
          background-color: transparent !important;
        }
        html:has(.avote-overlay-root) {
          color-scheme: normal;
        }
        .avote-overlay-root,
        .avote-overlay-root * {
          /* Ne force pas les enfants glass ; le root doit rester sans fond opaque */
        }
        .avote-overlay-root {
          background: transparent !important;
          background-color: transparent !important;
          min-height: 100vh;
        }
      `}</style>
      <div
        className="avote-overlay-root"
        style={{ background: "transparent", backgroundColor: "transparent", minHeight: "100vh" }}
      >
        {children}
      </div>
    </>
  );
}
