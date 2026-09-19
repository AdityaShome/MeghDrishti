import type { ModelId } from "../types";

const MODEL_META: Record<ModelId, { label: string; desc: string }> = {
  pysteps: {
    label: "pySTEPS",
    desc: "Optical-flow extrapolation baseline. Calibrated mm/hr, 0-6h horizon.",
  },
  dgmr: {
    label: "DGMR",
    desc: "DeepMind's pretrained Skillful Nowcasting GAN (openclimatefix/dgmr), run zero-shot on our synthetic input. Output is relative intensity, not calibrated mm/hr — real weights, out-of-distribution demo data. 0-90min horizon.",
  },
};

export function ModelCard({
  model,
  onModelChange,
  frameVisible,
  onFrameVisibleChange,
  dgmrUnavailable,
}: {
  model: ModelId;
  onModelChange: (m: ModelId) => void;
  frameVisible: boolean;
  onFrameVisibleChange: (v: boolean) => void;
  dgmrUnavailable: boolean;
}) {
  return (
    <div className="card">
      <div className="card-head">
        <h2>Nowcast model</h2>
      </div>
      <div className="card-body">
        <div className="segmented">
          {(Object.keys(MODEL_META) as ModelId[]).map((id) => (
            <button
              key={id}
              className={`seg-btn ${model === id ? "active" : ""}`}
              onClick={() => onModelChange(id)}
              disabled={id === "dgmr" && dgmrUnavailable}
              title={id === "dgmr" && dgmrUnavailable ? "DGMR unavailable in this backend process" : undefined}
            >
              {MODEL_META[id].label}
            </button>
          ))}
        </div>
        <div className="model-desc">{MODEL_META[model].desc}</div>
        <div className="toggle-row">
          <span>Model forecast overlay</span>
          <label className="switch">
            <input type="checkbox" checked={frameVisible} onChange={(e) => onFrameVisibleChange(e.target.checked)} />
            <span className="slider-track" />
          </label>
        </div>
      </div>
    </div>
  );
}
