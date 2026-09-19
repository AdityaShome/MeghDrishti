import { VAR_COLOR_STOPS } from "../lib/colors";
import type { WeatherLayer } from "../types";

type VarId = "none" | "temperature" | "humidity" | "wind_speed";

const LABELS: Record<Exclude<VarId, "none">, string> = {
  temperature: "Temp",
  humidity: "Humidity",
  wind_speed: "Wind",
};

export function WeatherVariablesCard({
  activeVar,
  onChange,
  meta,
}: {
  activeVar: VarId;
  onChange: (v: VarId) => void;
  meta: WeatherLayer | null;
}) {
  const stops = activeVar !== "none" ? VAR_COLOR_STOPS[activeVar] : null;

  return (
    <div className="card">
      <div className="card-head">
        <h2>Weather variables</h2>
      </div>
      <div className="card-body">
        <div className="segmented grid2">
          <button className={`seg-btn ${activeVar === "none" ? "active" : ""}`} onClick={() => onChange("none")}>
            None
          </button>
          {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((id) => (
            <button key={id} className={`seg-btn ${activeVar === id ? "active" : ""}`} onClick={() => onChange(id)}>
              {LABELS[id]}
            </button>
          ))}
        </div>
        <div
          className="var-legend-scale"
          style={{ background: stops ? `linear-gradient(90deg, ${stops.join(",")})` : "#1f2937" }}
        />
        <div className="var-legend-labels">
          <span>{meta ? `${meta.vmin}${meta.unit}` : "—"}</span>
          <span style={{ color: "var(--text-dim)" }}>{meta ? meta.label : "select a variable"}</span>
          <span>{meta ? `${meta.vmax}${meta.unit}` : "—"}</span>
        </div>
        <div className="source-note">
          <span className="badge">SYNTHETIC</span>
          Ambient field, not an IMD/MOSDAC product — smooth climatology + storm perturbation.
        </div>
      </div>
    </div>
  );
}
