import { HAZARD_COLOR } from "../lib/colors";

export function HazardLegendCard({
  satelliteVisible,
  onSatelliteToggle,
  radarVisible,
  onRadarToggle,
}: {
  satelliteVisible: boolean;
  onSatelliteToggle: (v: boolean) => void;
  radarVisible: boolean;
  onRadarToggle: (v: boolean) => void;
}) {
  return (
    <div className="card">
      <div className="card-head">
        <h2>Hazard layers</h2>
      </div>
      <div className="card-body">
        <div className="legend-row">
          <span className="legend-swatch" style={{ background: HAZARD_COLOR.hail }} /> Hail
        </div>
        <div className="legend-row">
          <span className="legend-swatch" style={{ background: HAZARD_COLOR.downburst }} /> Downburst
        </div>
        <div className="legend-row">
          <span className="legend-swatch" style={{ background: HAZARD_COLOR.cloudburst }} /> Cloudburst
        </div>
        <div className="legend-row">
          <span className="legend-swatch" style={{ background: HAZARD_COLOR.lightning }} /> Lightning
        </div>
        <div className="toggle-row">
          <span>Satellite IR</span>
          <label className="switch">
            <input type="checkbox" checked={satelliteVisible} onChange={(e) => onSatelliteToggle(e.target.checked)} />
            <span className="slider-track" />
          </label>
        </div>
        <div className="toggle-row">
          <span>Radar reflectivity</span>
          <label className="switch">
            <input type="checkbox" checked={radarVisible} onChange={(e) => onRadarToggle(e.target.checked)} />
            <span className="slider-track" />
          </label>
        </div>
        <div className="source-note">
          <span className="badge">SYNTHETIC</span>
          No live MOSDAC/IMD radar, satellite, or lightning feed — every layer is a physically-consistent mock for
          demo purposes.
        </div>
      </div>
    </div>
  );
}
