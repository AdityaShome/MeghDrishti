import { X } from "lucide-react";
import type { AreaForecast, Bbox } from "../types";

export type AreaVarId = "none" | "temperature" | "humidity" | "wind_speed" | "pressure";

const VARS: { id: AreaVarId; label: string }[] = [
  { id: "none", label: "None" },
  { id: "temperature", label: "Temp" },
  { id: "humidity", label: "Humidity" },
  { id: "wind_speed", label: "Wind" },
  { id: "pressure", label: "Pressure" },
];

function statRow(
  label: string,
  unit: string,
  stat: { min: number; mean: number; max: number } | null | undefined,
  loading: boolean,
  highlighted: boolean
) {
  return (
    <div
      className="hazard-stat"
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        borderRadius: 6,
        padding: highlighted ? "3px 6px" : "3px 0",
        background: highlighted ? "rgba(63,182,255,0.12)" : "transparent",
      }}
    >
      <span className="lbl">{label}</span>
      <span className="val">
        {stat ? `${stat.min}–${stat.max}${unit} (avg ${stat.mean}${unit})` : loading ? "loading…" : "—"}
      </span>
    </div>
  );
}

export function AreaFloating({
  bbox,
  reading,
  loading,
  error,
  leadMinutes,
  onLeadChange,
  hazardCount,
  areaVar,
  onAreaVarChange,
  onClose,
}: {
  bbox: Bbox;
  reading: AreaForecast | null;
  loading: boolean;
  error: string | null;
  leadMinutes: number;
  onLeadChange: (m: number) => void;
  hazardCount: number;
  areaVar: AreaVarId;
  onAreaVarChange: (v: AreaVarId) => void;
  onClose: () => void;
}) {
  const leadLabel = leadMinutes === 0 ? "Now" : `+${Math.floor(leadMinutes / 60)}h ${leadMinutes % 60}m`;
  const [lonMin, latMin, lonMax, latMax] = bbox;
  const widthKm = Math.round((lonMax - lonMin) * 111 * Math.cos(((latMin + latMax) / 2) * (Math.PI / 180)));
  const heightKm = Math.round((latMax - latMin) * 111);

  return (
    <div className="region-floating">
      <div className="drawer-head">
        <h2>Selected area</h2>
        <button className="drawer-close" onClick={onClose} aria-label="Close">
          <X size={14} />
        </button>
      </div>
      <div className="panel-section">
        <div className="region-coords">
          {latMin.toFixed(2)}–{latMax.toFixed(2)}°N, {lonMin.toFixed(2)}–{lonMax.toFixed(2)}°E (~{widthKm}×{heightKm}km)
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 6 }}>
            Show on map (even with no hazards here)
          </div>
          <div className="seg-row grid3">
            {VARS.map((v) => (
              <button
                key={v.id}
                className={`seg-btn ${areaVar === v.id ? "active" : ""}`}
                onClick={() => onAreaVarChange(v.id)}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 10, fontSize: 11, color: "var(--danger)" }}>
            Couldn't load area stats: {error}
          </div>
        )}
        {loading && !reading && (
          <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-dim)" }}>
            Loading — the first fetch can take a few seconds…
          </div>
        )}
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 2 }}>
          {statRow("Temperature", "°C", reading?.temperature_c, loading, areaVar === "temperature")}
          {statRow("Humidity", "%", reading?.humidity_pct, loading, areaVar === "humidity")}
          {statRow("Wind speed", "m/s", reading?.wind_speed_ms, loading, areaVar === "wind_speed")}
          {statRow("Pressure", "hPa", reading?.pressure_hpa, loading, areaVar === "pressure")}
          <div className="hazard-stat" style={{ flexDirection: "row", justifyContent: "space-between", padding: "3px 0" }}>
            <span className="lbl">Cloudburst rain rate</span>
            <span className="val">
              {reading
                ? reading.cloudburst_rainrate_mm_hr === null
                  ? "n/a (outside storm grid)"
                  : `${reading.cloudburst_rainrate_mm_hr.min}–${reading.cloudburst_rainrate_mm_hr.max} mm/hr`
                : loading
                  ? "loading…"
                  : "—"}
            </span>
          </div>
          <div className="hazard-stat" style={{ flexDirection: "row", justifyContent: "space-between", padding: "3px 0" }}>
            <span className="lbl">Active hazards in area</span>
            <span className="val">{hazardCount}</span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--text-dim)", marginTop: 12, marginBottom: 4 }}>
          <span>Future time scale</span>
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>{leadLabel}</span>
        </div>
        <input type="range" min={0} max={360} step={30} value={leadMinutes} onChange={(e) => onLeadChange(parseInt(e.target.value, 10))} />
      </div>
    </div>
  );
}
