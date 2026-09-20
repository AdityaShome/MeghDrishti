import { useEffect, useRef, useState } from "react";
import { Pause, Play, X } from "lucide-react";
import { api } from "../api";
import { HAZARD_COLOR } from "../lib/colors";
import type { HistoryHazardsResponse } from "../types";

function parseTimestamp(ts: string): Date {
  // 20260918T083650Z -> ISO 8601
  const iso = `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}T${ts.slice(9, 11)}:${ts.slice(11, 13)}:${ts.slice(13, 15)}Z`;
  return new Date(iso);
}

export function ReplayPage({ onClose }: { onClose: () => void }) {
  const [timestamps, setTimestamps] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [snapshot, setSnapshot] = useState<HistoryHazardsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    api.historyTimestamps().then((res) => {
      setTimestamps(res.timestamps);
      setIndex(Math.max(0, res.timestamps.length - 1));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!timestamps.length) return;
    api.historyHazards(timestamps[index]).then(setSnapshot);
  }, [timestamps, index]);

  const indexRef = useRef(index);
  indexRef.current = index;
  useEffect(() => {
    if (!isPlaying || !timestamps.length) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1 >= timestamps.length ? 0 : i + 1));
    }, 1200);
    return () => clearInterval(id);
  }, [isPlaying, timestamps.length]);

  const counts: Record<string, number> = { hail: 0, downburst: 0, lightning: 0 };
  for (const f of snapshot?.features ?? []) {
    for (const h of f.properties.hazards) counts[h.type] = (counts[h.type] ?? 0) + 1;
  }

  return (
    <div className="hazards-page">
      <div className="hazards-page-head">
        <h1>Replay</h1>
        <button className="drawer-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="hazards-page-body">
        {loading ? (
          <div style={{ color: "var(--text-dim)" }}>Loading snapshot history…</div>
        ) : timestamps.length === 0 ? (
          <div style={{ color: "var(--text-dim)", fontSize: 13, lineHeight: 1.6 }}>
            No historical snapshots yet — the backend only has what it's ingested since it started running.
            Each ingestion cycle ({" "}
            <span className="mono">15 min</span> by default) writes one more. Check back after the server has
            been up a while.
          </div>
        ) : (
          <>
            <div className="note-text" style={{ marginBottom: 16, borderTop: "none", paddingTop: 0 }}>
              <span className="real-badge">REAL</span>
              Reconstructed from actual persisted IMD/satellite/radar snapshots for this exact moment — not a
              re-run of "now". Cloudburst is omitted (pySTEPS has no persisted historical sequence to replay
              against).
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div
                className="icon-btn"
                style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--accent)", color: "#000", cursor: "pointer" }}
                onClick={() => setIsPlaying((v) => !v)}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </div>
              <input
                type="range"
                min={0}
                max={timestamps.length - 1}
                value={index}
                onChange={(e) => {
                  setIsPlaying(false);
                  setIndex(parseInt(e.target.value, 10));
                }}
                style={{ flex: 1 }}
              />
              <div className="mono" style={{ fontSize: 12, color: "#fff", minWidth: 160, textAlign: "right" }}>
                {parseTimestamp(timestamps[index]).toLocaleString()}
              </div>
            </div>

            <div className="hazard-filter-row">
              <span className="hazard-filter-btn active">Snapshot {index + 1} / {timestamps.length}</span>
              {Object.entries(counts).map(([type, n]) => (
                <span key={type} className="hazard-filter-btn">
                  <span className="dot" style={{ background: HAZARD_COLOR[type as keyof typeof HAZARD_COLOR] }} />
                  {type} ({n})
                </span>
              ))}
            </div>

            {!snapshot || snapshot.features.length === 0 ? (
              <div style={{ color: "var(--text-dim)", fontSize: 13, padding: "24px 0" }}>No hazards at this snapshot.</div>
            ) : (
              <table className="hazards-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Severity</th>
                    <th>Location</th>
                    <th>Metric</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.features.flatMap((f, fi) =>
                    f.properties.hazards.map((h, hi) => {
                      const [lon, lat] = f.geometry.coordinates;
                      const location = f.properties.name || f.properties.station_id || `${lat.toFixed(3)}°N, ${lon.toFixed(3)}°E`;
                      const metric =
                        h.reflectivity_dbz !== undefined
                          ? `${h.reflectivity_dbz} dBZ`
                          : h.velocity_delta_ms !== undefined
                            ? `${h.velocity_delta_ms} m/s`
                            : "—";
                      return (
                        <tr key={`${fi}-${hi}`}>
                          <td>
                            <span className="type-chip">
                              <span className="dot" style={{ background: HAZARD_COLOR[h.type] }} />
                              {h.type}
                            </span>
                          </td>
                          <td>
                            <span className={`sev-chip ${h.severity}`}>{h.severity}</span>
                          </td>
                          <td>{location}</td>
                          <td>{metric}</td>
                        </tr>
                      );
                    }),
                  )}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
