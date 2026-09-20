import { MapPin } from "lucide-react";
import logo from "../assets/logo.png";

export function TopBar({ apiOk, lastUpdated }: { apiOk: boolean; lastUpdated: Date | null }) {
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <img src={logo} alt="MeghDrishti logo" width={26} height={26} style={{ borderRadius: 6, objectFit: "cover" }} />
        </div>
        <div className="brand-text">
          <h1>
            MeghDrishti <span className="badge" style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}>SIH 2026</span>
          </h1>
          <p>Convective-scale nowcast operations — 0-6h hazard forecast.</p>
        </div>
      </div>

      <div className="topbar-center">
        <div className="live-badge">
          <div className="live-dot" style={{ background: apiOk ? "var(--ok)" : "var(--danger)" }} />
          {apiOk ? "Live" : "Offline"}
        </div>
        <div>{lastUpdated ? `Last update: ${lastUpdated.toLocaleString()}` : "Waiting for first update…"}</div>
      </div>

      <div className="topbar-right">
        <div className="location-chip">
          <MapPin size={14} /> Pune, Maharashtra
        </div>
      </div>
    </div>
  );
}
