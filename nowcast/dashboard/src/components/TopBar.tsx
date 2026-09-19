import { MapPin } from "lucide-react";

export function TopBar({ apiOk, lastUpdated }: { apiOk: boolean; lastUpdated: Date | null }) {
  return (
    <div className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
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
