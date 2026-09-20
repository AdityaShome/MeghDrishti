import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { HAZARD_COLOR } from "../lib/colors";
import type { HazardsResponse, HazardType, StormCell } from "../types";

interface Row {
  type: HazardType;
  severity: string;
  metricLabel: string;
  metricValue: string;
  location: string;
  lat: number;
  lon: number;
  timestamp?: string;
  etaMinutes?: number;
}

function metricFor(type: HazardType, h: { reflectivity_dbz?: number; velocity_delta_ms?: number; rainrate_mm_hr?: number }): { label: string; value: string } {
  if (type === "hail" && h.reflectivity_dbz !== undefined) return { label: "Reflectivity", value: `${h.reflectivity_dbz} dBZ` };
  if (type === "downburst" && h.velocity_delta_ms !== undefined) return { label: "Velocity delta", value: `${h.velocity_delta_ms} m/s` };
  if (type === "cloudburst" && h.rainrate_mm_hr !== undefined) return { label: "Rain rate", value: `${h.rainrate_mm_hr} mm/hr` };
  return { label: "—", value: "—" };
}

function buildRows(hazards: HazardsResponse | null, stormCells: StormCell[] | null): Row[] {
  if (!hazards) return [];
  const rows: Row[] = [];
  for (const f of hazards.features) {
    const [lon, lat] = f.geometry.coordinates;
    const location = f.properties.name || f.properties.station_id || `${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E`;
    for (const h of f.properties.hazards) {
      const metric = metricFor(h.type, h);
      const matchingCell = f.properties.station_id
        ? (stormCells ?? []).find((c) => c.station_id === f.properties.station_id && c.hazards.some((ch) => ch.type === h.type))
        : undefined;
      rows.push({
        type: h.type,
        severity: h.severity,
        metricLabel: metric.label,
        metricValue: metric.value,
        location,
        lat,
        lon,
        timestamp: f.properties.timestamp,
        etaMinutes: matchingCell?.eta_minutes,
      });
    }
  }
  // high severity first, then soonest ETA, then type
  return rows.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "high" ? -1 : 1;
    if (a.etaMinutes !== undefined && b.etaMinutes !== undefined) return a.etaMinutes - b.etaMinutes;
    return a.type.localeCompare(b.type);
  });
}

// /hazards is now real, all-India hail+lightning — downburst/cloudburst
// have no real all-India equivalent (see hazard_india.py) and were
// dropped from the filter row rather than always showing an empty result.
const ALL_TYPES: HazardType[] = ["hail", "lightning"];

export function HazardsPage({
  hazards,
  stormCells,
  onClose,
  onSelectLocation,
}: {
  hazards: HazardsResponse | null;
  stormCells: StormCell[] | null;
  onClose: () => void;
  onSelectLocation: (lat: number, lon: number) => void;
}) {
  const [filter, setFilter] = useState<HazardType | "all">("all");
  const rows = useMemo(() => buildRows(hazards, stormCells), [hazards, stormCells]);
  const visibleRows = filter === "all" ? rows : rows.filter((r) => r.type === filter);
  const counts = useMemo(() => {
    const c: Record<string, number> = { hail: 0, downburst: 0, cloudburst: 0, lightning: 0 };
    for (const r of rows) c[r.type] = (c[r.type] ?? 0) + 1;
    return c;
  }, [rows]);

  return (
    <div className="hazards-page">
      <div className="hazards-page-head">
        <h1>All Hazards ({rows.length})</h1>
        <button className="drawer-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="hazards-page-body">
        <div className="hazard-filter-row">
          <button className={`hazard-filter-btn ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
            All ({rows.length})
          </button>
          {ALL_TYPES.map((t) => (
            <button key={t} className={`hazard-filter-btn ${filter === t ? "active" : ""}`} onClick={() => setFilter(t)}>
              <span className="dot" style={{ background: HAZARD_COLOR[t] }} />
              {t[0].toUpperCase() + t.slice(1)} ({counts[t] ?? 0})
            </button>
          ))}
        </div>

        {visibleRows.length === 0 ? (
          <div style={{ color: "var(--text-dim)", fontSize: 13, padding: "24px 0" }}>No hazards match this filter.</div>
        ) : (
          <table className="hazards-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Severity</th>
                <th>Location</th>
                <th>Metric</th>
                <th>ETA</th>
                <th>Reported</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r, i) => (
                <tr key={i} className="clickable" onClick={() => onSelectLocation(r.lat, r.lon)}>
                  <td>
                    <span className="type-chip">
                      <span className="dot" style={{ background: HAZARD_COLOR[r.type] }} />
                      {r.type}
                    </span>
                  </td>
                  <td>
                    <span className={`sev-chip ${r.severity}`}>{r.severity}</span>
                  </td>
                  <td>{r.location}</td>
                  <td>
                    {r.metricLabel !== "—" ? (
                      <>
                        <span style={{ color: "var(--text-dim)" }}>{r.metricLabel}: </span>
                        {r.metricValue}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="mono">{r.etaMinutes !== undefined ? `${Math.round(r.etaMinutes)}m` : "—"}</td>
                  <td className="mono">{r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
