import { X } from "lucide-react";
import type { AreaForecast, Bbox } from "../types";

function statRow(label: string, unit: string, stat: { min: number; mean: number; max: number } | null | undefined) {
  return (
    <div className="hazard-stat" style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <span className="lbl">{label}</span>
      <span className="val">{stat ? `${stat.min}–${stat.max}${unit} (avg ${stat.mean}${unit})` : "…"}</span>
    </div>
  );
}

export function AreaFloating({
  bbox,
  reading,
  leadMinutes,
  onLeadChange,
  hazardCount,
  onClose,
}: {
  bbox: Bbox;
  reading: AreaForecast | null;
  leadMinutes: number;
  onLeadChange: (m: number) => void;
  hazardCount: number;
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
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {statRow("Temperature", "°C", reading?.temperature_c)}
          {statRow("Humidity", "%", reading?.humidity_pct)}
          {statRow("Wind speed", "m/s", reading?.wind_speed_ms)}
          {statRow("Pressure", "hPa", reading?.pressure_hpa)}
          <div className="hazard-stat" style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <span className="lbl">Cloudburst rain rate</span>
            <span className="val">
              {reading
                ? reading.cloudburst_rainrate_mm_hr === null
                  ? "n/a (outside storm grid)"
                  : `${reading.cloudburst_rainrate_mm_hr.min}–${reading.cloudburst_rainrate_mm_hr.max} mm/hr`
                : "…"}
            </span>
          </div>
          <div className="hazard-stat" style={{ flexDirection: "row", justifyContent: "space-between" }}>
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
