import { X } from "lucide-react";
import { BASE_LAYERS, OVERLAY_LAYERS } from "../lib/mosdacLayers";
import { VAR_COLOR_STOPS } from "../lib/colors";
import type { ModelId, WeatherLayer } from "../types";

type VarId = "none" | "temperature" | "humidity" | "wind_speed" | "pressure" | "rainfall" | "composite_risk";

export function LayersDrawer({
  onClose,
  model,
  onModelChange,
  dgmrUnavailable,
  modelFrameVisible,
  onModelFrameVisibleChange,
  baseMapId,
  onBaseMapChange,
  activeOverlayIds,
  onOverlayToggle,
  activeVar,
  onVarChange,
  activeVarMeta,
  weatherSource,
}: {
  onClose: () => void;
  model: ModelId;
  onModelChange: (m: ModelId) => void;
  dgmrUnavailable: boolean;
  modelFrameVisible: boolean;
  onModelFrameVisibleChange: (v: boolean) => void;
  baseMapId: string;
  onBaseMapChange: (id: string) => void;
  activeOverlayIds: Set<string>;
  onOverlayToggle: (id: string) => void;
  activeVar: VarId;
  onVarChange: (v: VarId) => void;
  activeVarMeta: WeatherLayer | null;
  weatherSource: "ecmwf-opendata" | "synthetic" | null;
}) {
  const stops = activeVar !== "none" ? VAR_COLOR_STOPS[activeVar] : null;

  return (
    <div className="layers-drawer">
      <div className="drawer-head">
        <h2>Layers</h2>
        <button className="drawer-close" onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>

      <div className="panel-section">
        <div className="section-title">Nowcast model</div>
        <div className="seg-row">
          <button className={`seg-btn ${model === "pysteps" ? "active" : ""}`} onClick={() => onModelChange("pysteps")}>
            pySTEPS
          </button>
          <button
            className={`seg-btn ${model === "dgmr" ? "active" : ""}`}
            onClick={() => onModelChange("dgmr")}
            disabled={dgmrUnavailable}
            title={dgmrUnavailable ? "DGMR unavailable in this backend process" : undefined}
          >
            DGMR
          </button>
          <button
            className={`seg-btn ${model === "smaat" ? "active" : ""}`}
            onClick={() => onModelChange("smaat")}
          >
            SmaAt-UNet
          </button>
        </div>
        <div style={{ fontSize: 10.5, color: "var(--text-dim)", marginTop: 9, lineHeight: 1.5 }}>
          {model === "pysteps"
            ? "Optical-flow extrapolation baseline. Calibrated mm/hr, 0-6h horizon."
            : model === "dgmr"
            ? "DeepMind's pretrained Skillful Nowcasting GAN, run zero-shot. Relative intensity, not calibrated mm/hr. 0-90min horizon."
            : "SmaAt-UNet: Custom Spatial-Channel Attention UNet. Currently training on SEVIR dataset."}
        </div>
        <label className="check-row" style={{ marginTop: 8 }}>
          <input type="checkbox" checked={modelFrameVisible} onChange={(e) => onModelFrameVisibleChange(e.target.checked)} />
          Show model forecast overlay
        </label>
      </div>

      <div className="panel-section">
        <div className="section-title">Weather variables</div>
        <div className="seg-row grid3">
          <button className={`seg-btn ${activeVar === "none" ? "active" : ""}`} onClick={() => onVarChange("none")}>
            None
          </button>
          <button className={`seg-btn ${activeVar === "temperature" ? "active" : ""}`} onClick={() => onVarChange("temperature")}>
            Temp
          </button>
          <button className={`seg-btn ${activeVar === "humidity" ? "active" : ""}`} onClick={() => onVarChange("humidity")}>
            Humidity
          </button>
          <button className={`seg-btn ${activeVar === "wind_speed" ? "active" : ""}`} onClick={() => onVarChange("wind_speed")}>
            Wind
          </button>
          <button className={`seg-btn ${activeVar === "pressure" ? "active" : ""}`} onClick={() => onVarChange("pressure")}>
            Pressure
          </button>
          <button className={`seg-btn ${activeVar === "rainfall" ? "active" : ""}`} onClick={() => onVarChange("rainfall")}>
            Rainfall
          </button>
          <button className={`seg-btn ${activeVar === "composite_risk" ? "active" : ""}`} onClick={() => onVarChange("composite_risk")}>
            Risk Index
          </button>
        </div>
        {stops && (
          <>
            <div style={{ height: 8, borderRadius: 4, marginTop: 10, background: `linear-gradient(90deg, ${stops.join(",")})` }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-faint)", marginTop: 3 }}>
              <span>{activeVarMeta ? `${activeVarMeta.vmin}${activeVarMeta.unit}` : "—"}</span>
              <span>{activeVarMeta ? `${activeVarMeta.vmax}${activeVarMeta.unit}` : "—"}</span>
            </div>
          </>
        )}
        {weatherSource === "ecmwf-opendata" && activeVar !== "rainfall" && (
          <div className="note-text">
            <span className="real-badge">REAL</span>
            ECMWF Open Data (HRES forecast, CC-BY-4.0) — no API key needed.
          </div>
        )}
      </div>

      <div className="panel-section">
        <div className="section-title">Base map</div>
        <select className="select-field" value={baseMapId} onChange={(e) => onBaseMapChange(e.target.value)}>
          <option value="none">Esri Dark Canvas (default)</option>
          {BASE_LAYERS.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
        <div className="note-text">
          <span className="real-badge">REAL</span>
          MOSDAC/Bhuvan GIS base imagery — genuine ISRO government data.
        </div>
      </div>

      <div className="panel-section">
        <div className="section-title">
          GIS overlays <span className="count">({activeOverlayIds.size})</span>
        </div>
        <div style={{ maxHeight: 220, overflowY: "auto" }}>
          {OVERLAY_LAYERS.map((l) => (
            <label className="check-row" key={l.id}>
              <input type="checkbox" checked={activeOverlayIds.has(l.id)} onChange={() => onOverlayToggle(l.id)} />
              {l.label}
            </label>
          ))}
        </div>
        <div className="note-text">
          <span className="real-badge">REAL</span>
          MOSDAC CloudBurst DSS layers (mosdac.gov.in/cloudburst/), verified live.
        </div>
      </div>
    </div>
  );
}
