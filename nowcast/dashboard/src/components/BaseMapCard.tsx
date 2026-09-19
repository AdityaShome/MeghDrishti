import { BASE_LAYERS } from "../lib/mosdacLayers";

export function BaseMapCard({ selectedId, onChange }: { selectedId: string; onChange: (id: string) => void }) {
  return (
    <div className="card">
      <div className="card-head">
        <h2>Base map</h2>
      </div>
      <div className="card-body">
        <select
          value={selectedId}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            background: "#141b2b",
            color: "var(--text)",
            border: "1px solid var(--panel-border)",
            borderRadius: 6,
            padding: "7px 8px",
            fontSize: 12,
            fontFamily: "Inter, sans-serif",
          }}
        >
          <option value="none">Esri Dark Canvas (default)</option>
          {BASE_LAYERS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
        <div className="source-note" style={{ marginTop: 10 }}>
          <span className="badge" style={{ background: "rgba(52,211,153,0.15)", color: "var(--ok)" }}>REAL</span>
          MOSDAC/Bhuvan GIS base imagery — genuine ISRO government data, not synthetic.
        </div>
      </div>
    </div>
  );
}
