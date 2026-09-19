import type { ModelId } from "../types";

const MODEL_RANGE: Record<ModelId, { max: number; step: number }> = {
  pysteps: { max: 360, step: 10 },
  dgmr: { max: 90, step: 5 },
};

export function TimelineCard({
  model,
  leadMinutes,
  onLeadChange,
}: {
  model: ModelId;
  leadMinutes: number;
  onLeadChange: (m: number) => void;
}) {
  const { max, step } = MODEL_RANGE[model];
  const label = leadMinutes === 0 ? "Now" : `+${Math.floor(leadMinutes / 60)}h ${leadMinutes % 60}m`;

  return (
    <div className="timeline card">
      <div className="card-body">
        <div className="timeline-head">
          <span className="label">{model === "dgmr" ? "DGMR" : "pySTEPS"} lead time</span>
          <span className="value mono">{label}</span>
        </div>
        <input
          type="range"
          min={0}
          max={max}
          step={step}
          value={Math.min(leadMinutes, max)}
          onChange={(e) => onLeadChange(parseInt(e.target.value, 10))}
        />
        {model === "pysteps" && (
          <div className="ticks">
            <span>0h</span>
            <span>1h</span>
            <span>2h</span>
            <span>3h</span>
            <span>4h</span>
            <span>5h</span>
            <span>6h</span>
          </div>
        )}
      </div>
    </div>
  );
}
