import { X } from "lucide-react";
import { windCompass } from "../lib/colors";
import type { RegionForecast } from "../types";

export function RegionFloating({
  region,
  reading,
  leadMinutes,
  onLeadChange,
  onClose,
}: {
  region: { lat: number; lon: number };
  reading: RegionForecast | null;
  leadMinutes: number;
  onLeadChange: (m: number) => void;
  onClose: () => void;
}) {
  const leadLabel = leadMinutes === 0 ? "Now" : `+${Math.floor(leadMinutes / 60)}h ${leadMinutes % 60}m`;

  return (
    <div className="region-floating">
      <div className="drawer-head">
        <h2>Selected region</h2>
        <button className="drawer-close" onClick={onClose} aria-label="Close">
          <X size={14} />
        </button>
      </div>
      <div className="panel-section">
        <div className="region-coords">
          {region.lat.toFixed(3)}°N, {region.lon.toFixed(3)}°E
        </div>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          <div className="hazard-stat" style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <span className="lbl">Temperature</span>
            <span className="val">{reading ? `${reading.temperature_c}°C` : "…"}</span>
          </div>
          <div className="hazard-stat" style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <span className="lbl">Humidity</span>
            <span className="val">{reading ? `${reading.humidity_pct}%` : "…"}</span>
          </div>
          <div className="hazard-stat" style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <span className="lbl">Wind</span>
            <span className="val">
              {reading ? `${reading.wind_speed_ms} m/s ${windCompass(reading.wind_dir_deg)}` : "…"}
            </span>
          </div>
          <div className="hazard-stat" style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <span className="lbl">Cloudburst rain rate</span>
            <span className="val">
              {reading
                ? reading.cloudburst_rainrate_mm_hr === null
                  ? "n/a"
                  : `${reading.cloudburst_rainrate_mm_hr} mm/hr`
                : "…"}
            </span>
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
