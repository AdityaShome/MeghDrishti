import { windCompass } from "../lib/colors";
import { VAR_COLOR_STOPS } from "../lib/colors";
import { TrendChart } from "./TrendChart";
import type { RegionForecast } from "../types";

export function RegionCard({
  region,
  reading,
  trend,
  leadMinutes,
  onLeadChange,
  onClose,
}: {
  region: { lat: number; lon: number } | null;
  reading: RegionForecast | null;
  trend: RegionForecast[] | null;
  leadMinutes: number;
  onLeadChange: (m: number) => void;
  onClose: () => void;
}) {
  if (!region) return null;

  const leadLabel = leadMinutes === 0 ? "Now" : `+${Math.floor(leadMinutes / 60)}h ${leadMinutes % 60}m`;

  return (
    <div className="card">
      <div className="card-head">
        <h2>Selected region</h2>
        <button className="region-close" onClick={onClose} aria-label="Close region panel">
          ✕
        </button>
      </div>
      <div className="card-body">
        <div className="region-coords mono">
          {region.lat.toFixed(3)}°N, {region.lon.toFixed(3)}°E
        </div>

        <div className="region-metric">
          <span className="k">Temperature</span>
          <span className="v">{reading ? `${reading.temperature_c}°C` : "…"}</span>
        </div>
        <div className="region-metric">
          <span className="k">Humidity</span>
          <span className="v">{reading ? `${reading.humidity_pct}%` : "…"}</span>
        </div>
        <div className="region-metric">
          <span className="k">Wind</span>
          <span className="v">{reading ? `${reading.wind_speed_ms} m/s ${windCompass(reading.wind_dir_deg)}` : "…"}</span>
        </div>
        <div className="region-metric">
          <span className="k">Cloudburst rain rate</span>
          <span className="v">
            {reading
              ? reading.cloudburst_rainrate_mm_hr === null
                ? "n/a (outside storm grid)"
                : `${reading.cloudburst_rainrate_mm_hr} mm/hr`
              : "…"}
          </span>
        </div>

        <div className="region-slider-head">
          <span>Future time scale</span>
          <span className="v">{leadLabel}</span>
        </div>
        <input
          type="range"
          min={0}
          max={360}
          step={30}
          value={leadMinutes}
          onChange={(e) => onLeadChange(parseInt(e.target.value, 10))}
        />

        {trend && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <TrendLabel label="Temperature" unit="°C" color={VAR_COLOR_STOPS.temperature[1]} trend={trend} field="temperature_c" />
            <TrendLabel label="Humidity" unit="%" color={VAR_COLOR_STOPS.humidity[2]} trend={trend} field="humidity_pct" />
            <TrendLabel label="Wind" unit=" m/s" color={VAR_COLOR_STOPS.wind_speed[2]} trend={trend} field="wind_speed_ms" />
          </div>
        )}
      </div>
    </div>
  );
}

function TrendLabel({
  label,
  unit,
  color,
  trend,
  field,
}: {
  label: string;
  unit: string;
  color: string;
  trend: RegionForecast[];
  field: keyof RegionForecast;
}) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginBottom: 3 }}>{label} (0-6h)</div>
      <TrendChart
        points={trend.map((t) => ({ leadMin: t.lead_minutes, value: Number(t[field]) }))}
        color={color}
        unit={unit}
      />
    </div>
  );
}
