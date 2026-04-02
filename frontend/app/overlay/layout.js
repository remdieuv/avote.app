/** Fond transparent pour capture navigateur / OBS sur cette arborescence uniquement */
export default function OverlayLayout({ children }) {
  return (
    <>
      <style>{`
        html:has(.avote-overlay-root),
        body:has(.avote-overlay-root) {
          background: transparent !important;
        }
      `}</style>
      <div className="avote-overlay-root" style={{ background: "transparent" }}>
        {children}
      </div>
    </>
  );
}
