import { useEffect, useRef, useState } from "react";
import type { StormCell } from "../types";
import { HAZARD_COLOR } from "../lib/colors";

interface TimedCell extends StormCell {
  fetchedAt: number;
}

function formatCountdown(remainingMin: number): string {
  const mm = Math.max(0, Math.floor(remainingMin));
  const ss = Math.max(0, Math.floor((remainingMin - mm) * 60))
    .toString()
    .padStart(2, "0");
  return `${mm}:${ss}`;
}

export function StormCellsPanel({
  cells,
  loading,
  onSelect,
}: {
  cells: StormCell[] | null;
  loading: boolean;
  onSelect: (cell: StormCell) => void;
}) {
  const [timedCells, setTimedCells] = useState<TimedCell[]>([]);
  const [, forceTick] = useState(0);
  const prevCellsRef = useRef<StormCell[] | null>(null);

  useEffect(() => {
    if (cells && cells !== prevCellsRef.current) {
      prevCellsRef.current = cells;
      const now = Date.now();
      setTimedCells(cells.map((c) => ({ ...c, fetchedAt: now })));
    }
  }, [cells]);

  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="left-panel">
      <div className="card">
        <div className="card-head">
          <h2>Active storm cells</h2>
          <span className="count mono">{timedCells.length}</span>
        </div>
        <div className="cell-list">
          {loading && !timedCells.length && (
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="skeleton-line" />
              <div className="skeleton-line" style={{ width: "70%" }} />
              <div className="skeleton-line" style={{ width: "50%" }} />
            </div>
          )}
          {!loading && !timedCells.length && (
            <div className="empty-state">No active hazards in the current cycle.</div>
          )}
          {timedCells.map((c) => {
            const elapsedMin = (Date.now() - c.fetchedAt) / 60000;
            const remaining = c.eta_minutes - elapsedMin;
            return (
              <div className="cell" key={c.station_id} onClick={() => onSelect(c)}>
                <div className="cell-top">
                  <span className="cell-name">{c.name || c.station_id}</span>
                  <span className="cell-eta mono">{formatCountdown(remaining)}</span>
                </div>
                <div className="cell-meta">
                  {c.distance_km} km · {c.bearing_deg}° · {c.speed_kmh} km/h ({c.motion_source})
                </div>
                <div className="tags">
                  {c.hazards.map((h, i) => (
                    <span className={`tag tag-${h.type}`} key={i}>
                      <span className="dot" style={{ background: HAZARD_COLOR[h.type] }} />
                      {h.type}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
