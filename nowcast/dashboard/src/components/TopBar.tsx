export function TopBar() {
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark" />
        <div>
          <div className="brand-title">MeghDrishti</div>
          <div className="brand-subtitle">Convective-scale nowcast operations</div>
        </div>
      </div>
      <div className="topbar-right">
        <span className="region-chip">PUNE · 73.6–74.1E, 18.3–18.8N</span>
        <span>
          <span className="live-dot" />
          LIVE (SYNTHETIC)
        </span>
      </div>
    </div>
  );
}
