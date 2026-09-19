import { TrendChart } from "./TrendChart";
import type { ForecastSummary, HazardsResponse, ModelId } from "../types";

const TIMELINE_STEPS_PYSTEPS = [0, 60, 120, 180, 240, 300, 360];
const TIMELINE_STEPS_DGMR = [0, 15, 30, 45, 60, 75, 90];

export function BottomPanel({
  model,
  leadMinutes,
  onLeadChange,
  forecast,
  hazards,
}: {
  model: ModelId;
  leadMinutes: number;
  onLeadChange: (m: number) => void;
  forecast: ForecastSummary | null;
  hazards: HazardsResponse | null;
}) {
  const steps = model === "dgmr" ? TIMELINE_STEPS_DGMR : TIMELINE_STEPS_PYSTEPS;

  const trendPoints =
    forecast?.timestamps_min && (forecast.max_rainrate_mm_hr || forecast.max_intensity)
      ? forecast.timestamps_min.map((t, i) => ({
          leadMin: t,
          value: (forecast.max_rainrate_mm_hr ?? forecast.max_intensity)![i],
        }))
      : [];

  const recentEvents = (hazards?.features ?? [])
    .filter((f) => f.properties.station_id && f.properties.timestamp)
    .slice(0, 4);

  return (
    <div className="bottom-panel">
      <div className="panel-section flex-1" style={{ borderRight: "1px solid var(--panel-border)" }}>
        <div className="section-title">
          {model === "dgmr" ? "DGMR" : "pySTEPS"} Lead Time <span className="count">(click to jump)</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
          {steps.map((m) => (
            <button
              key={m}
              onClick={() => onLeadChange(m)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: m === leadMinutes ? "var(--accent)" : "var(--panel-border-soft)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: m === leadMinutes ? "#06121e" : "var(--text-dim)",
                  fontWeight: 700,
                  fontSize: 10,
                }}
              >
                {m === 0 ? "0" : Math.floor(m / 60) || ""}
              </div>
              <div style={{ fontSize: 11, color: m === leadMinutes ? "#fff" : "var(--text-dim)" }}>
                {m === 0 ? "Now" : `+${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`}
              </div>
            </button>
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={steps[steps.length - 1]}
          step={steps[1] - steps[0]}
          value={leadMinutes}
          onChange={(e) => onLeadChange(parseInt(e.target.value, 10))}
          style={{ marginTop: 16 }}
        />
      </div>

      <div className="panel-section" style={{ width: 300, borderRight: "1px solid var(--panel-border)" }}>
        <div className="section-title">
          Rain-rate Forecast <span className="count">({model})</span>
        </div>
        {trendPoints.length > 1 ? (
          <TrendChart points={trendPoints} color="var(--accent)" unit={model === "dgmr" ? "" : " mm/hr"} height={70} />
        ) : (
          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>Loading forecast…</div>
        )}
      </div>

      <div className="panel-section" style={{ width: 300, borderRight: "1px solid var(--panel-border)" }}>
        <div className="section-title">Recent Station Reports</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {recentEvents.length === 0 && <div style={{ fontSize: 11, color: "var(--text-dim)" }}>No station hazards this cycle.</div>}
          {recentEvents.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 12, fontSize: 11 }}>
              <div style={{ color: "var(--hail)" }}>
                {f.properties.timestamp ? new Date(f.properties.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
              </div>
              <div style={{ color: "var(--text-dim)" }}>
                {f.properties.name || f.properties.station_id}: {f.properties.hazards.map((h) => h.type).join(", ")}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-section" style={{ width: 220 }}>
        <div className="section-title">Replay</div>
        <div style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.5 }}>
          Not implemented — no historical archive endpoint exists yet.
        </div>
      </div>
    </div>
  );
}
