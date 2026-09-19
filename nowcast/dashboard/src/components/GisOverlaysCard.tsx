import { OVERLAY_LAYERS } from "../lib/mosdacLayers";

export function GisOverlaysCard({
  activeIds,
  onToggle,
}: {
  activeIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="card">
      <div className="card-head">
        <h2>GIS overlays</h2>
        <span className="count mono">{activeIds.size}</span>
      </div>
      <div className="card-body" style={{ maxHeight: 220, overflowY: "auto", paddingTop: 4, paddingBottom: 4 }}>
        {OVERLAY_LAYERS.map((l) => (
          <label
            key={l.id}
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "5px 0", cursor: "pointer" }}
          >
            <input type="checkbox" checked={activeIds.has(l.id)} onChange={() => onToggle(l.id)} />
            {l.label}
          </label>
        ))}
        <div className="source-note">
          <span className="badge" style={{ background: "rgba(52,211,153,0.15)", color: "var(--ok)" }}>REAL</span>
          MOSDAC CloudBurst DSS layers (mosdac.gov.in/cloudburst/) — real ISRO/NRSC GIS data, verified live.
        </div>
      </div>
    </div>
  );
}
