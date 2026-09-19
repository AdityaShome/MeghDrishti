import { Activity, Download } from "lucide-react";
import type { HazardsResponse, ModelId } from "../types";
import { INGEST_CYCLE_MINUTES } from "../lib/config";

const HAZARD_LABELS: Record<string, string> = {
  hail: "Hail",
  lightning: "Lightning",
  downburst: "Downburst",
  cloudburst: "Cloudburst",
};

function countByType(hazards: HazardsResponse | null): Record<string, number> {
  const counts: Record<string, number> = { hail: 0, lightning: 0, downburst: 0, cloudburst: 0 };
  if (!hazards) return counts;
  for (const f of hazards.features) {
    for (const h of f.properties.hazards) {
      counts[h.type] = (counts[h.type] ?? 0) + 1;
    }
  }
  return counts;
}

function exportHazards(hazards: HazardsResponse | null) {
  if (!hazards) return;
  const blob = new Blob([JSON.stringify(hazards, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hazards-${new Date().toISOString().replace(/[:.]/g, "-")}.geojson`;
  a.click();
  URL.revokeObjectURL(url);
}

export function LeftSidebar({
  hazards,
  model,
  apiOk,
  lastUpdated,
}: {
  hazards: HazardsResponse | null;
  model: ModelId;
  apiOk: boolean;
  lastUpdated: Date | null;
}) {
  const counts = countByType(hazards);

  return (
    <div className="sidebar left">
      <div className="panel-section">
        <div className="section-title">
          <Activity size={14} /> Pipeline status
        </div>
        <div className="source-toggle">
          <div className="name">
            <div className={`status-dot ${apiOk ? "ok" : "err"}`} /> Backend API
          </div>
          <div className="status" style={{ color: apiOk ? "var(--ok)" : "var(--danger)" }}>
            {apiOk ? "Live" : "Unreachable"}
          </div>
        </div>
        <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6 }}>
          {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Waiting for first fetch…"}
        </div>
      </div>

      <div className="panel-section">
        <div className="section-title">Data Sources</div>
        <div className="source-toggle">
          <div className="name">
            <div className={`status-dot ${apiOk ? "ok" : "err"}`} /> Doppler Radar (IMD)
          </div>
          <div className="status" style={{ color: apiOk ? "var(--ok)" : "var(--danger)" }}>
            {apiOk ? "Synthetic" : "Down"}
          </div>
        </div>
        <div className="source-toggle">
          <div className="name">
            <div className={`status-dot ${apiOk ? "ok" : "err"}`} /> INSAT-3D/3DR Satellite
          </div>
          <div className="status" style={{ color: apiOk ? "var(--ok)" : "var(--danger)" }}>
            {apiOk ? "Synthetic" : "Down"}
          </div>
        </div>
        <div className="source-toggle">
          <div className="name">
            <div className={`status-dot ${apiOk ? "ok" : "err"}`} /> Lightning (IMD feed)
          </div>
          <div className="status" style={{ color: apiOk ? "var(--ok)" : "var(--danger)" }}>
            {apiOk ? "Synthetic" : "Down"}
          </div>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-title">Active Hazards (now)</div>
        {Object.entries(HAZARD_LABELS).map(([type, label]) => (
          <div className="source-toggle" key={type}>
            <div className="name">
              <div className="status-dot" style={{ background: `var(--${type})` }} /> {label}
            </div>
            <div className="status" style={{ color: "var(--text)" }}>
              {counts[type]} {counts[type] === 1 ? "zone" : "zones"}
            </div>
          </div>
        ))}
      </div>

      <div className="panel-section">
        <div className="section-title">Model Info</div>
        <div className="grid-2">
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Model</div>
          <div style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>{model}</div>

          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Resolution</div>
          <div style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>1-3 km grid</div>

          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Forecast Horizon</div>
          <div style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>{model === "dgmr" ? "0-90 min" : "0-6 hours"}</div>

          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Update Interval</div>
          <div style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>{INGEST_CYCLE_MINUTES} min</div>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-title">Quick Tools</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button className="btn-secondary" onClick={() => exportHazards(hazards)} disabled={!hazards}>
            <Download size={14} /> Export Hazards (GeoJSON)
          </button>
        </div>
      </div>
    </div>
  );
}
