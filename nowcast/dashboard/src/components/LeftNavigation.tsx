import { Home, Layers, CloudRain, Zap, Play, Settings } from "lucide-react";

export function LeftNavigation({
  layersOpen,
  onToggleLayers,
  hazardsOpen,
  onToggleHazards,
}: {
  layersOpen: boolean;
  onToggleLayers: () => void;
  hazardsOpen: boolean;
  onToggleHazards: () => void;
}) {
  const onHome = () => {
    if (layersOpen) onToggleLayers();
    if (hazardsOpen) onToggleHazards();
  };

  return (
    <div className="left-nav">
      <button className={`nav-item ${!layersOpen && !hazardsOpen ? "active" : ""}`} onClick={onHome}>
        <Home size={22} />
        <span>Home</span>
      </button>
      <button className={`nav-item ${layersOpen ? "active" : ""}`} onClick={onToggleLayers}>
        <Layers size={22} />
        <span>Layers</span>
      </button>
      <button className="nav-item" disabled style={{ opacity: 0.35, cursor: "not-allowed" }} title="Not implemented yet — forecast data is already shown in the bottom panel">
        <CloudRain size={22} />
        <span>Forecast</span>
      </button>
      <button className={`nav-item ${hazardsOpen ? "active" : ""}`} onClick={onToggleHazards}>
        <Zap size={22} />
        <span>Hazards</span>
      </button>
      <button className="nav-item" disabled style={{ opacity: 0.35, cursor: "not-allowed" }} title="Not implemented — no historical archive endpoint">
        <Play size={22} />
        <span>Replay</span>
      </button>

      <div className="flex-1" />

      <button className="nav-item" disabled style={{ opacity: 0.35, cursor: "not-allowed" }} title="Not implemented yet">
        <Settings size={22} />
        <span>Settings</span>
      </button>
    </div>
  );
}
