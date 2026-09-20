import { Home, Layers, CloudRain, Zap, Play, Settings } from "lucide-react";

export type ActivePanel = "none" | "layers" | "hazards" | "forecast" | "replay";

export function LeftNavigation({ active, onSelect }: { active: ActivePanel; onSelect: (panel: ActivePanel) => void }) {
  const toggle = (panel: ActivePanel) => onSelect(active === panel ? "none" : panel);

  return (
    <div className="left-nav">
      <button className={`nav-item ${active === "none" ? "active" : ""}`} onClick={() => onSelect("none")}>
        <Home size={22} />
        <span>Home</span>
      </button>
      <button className={`nav-item ${active === "layers" ? "active" : ""}`} onClick={() => toggle("layers")}>
        <Layers size={22} />
        <span>Layers</span>
      </button>
      <button className={`nav-item ${active === "forecast" ? "active" : ""}`} onClick={() => toggle("forecast")}>
        <CloudRain size={22} />
        <span>Forecast</span>
      </button>
      <button className={`nav-item ${active === "hazards" ? "active" : ""}`} onClick={() => toggle("hazards")}>
        <Zap size={22} />
        <span>Hazards</span>
      </button>
      <button className={`nav-item ${active === "replay" ? "active" : ""}`} onClick={() => toggle("replay")}>
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
