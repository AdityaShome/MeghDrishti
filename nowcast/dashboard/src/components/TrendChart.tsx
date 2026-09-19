interface TrendPoint {
  leadMin: number;
  value: number;
}

/** Small SVG line+area sparkline for a single variable's future trend. Built
 * by hand rather than pulling in a charting library — the data is 7 points,
 * a full chart lib would be overkill for this footprint. */
export function TrendChart({
  points,
  color,
  unit,
  height = 44,
}: {
  points: TrendPoint[];
  color: string;
  unit: string;
  height?: number;
}) {
  if (points.length < 2) return null;

  const width = 100; // viewBox units, scales via CSS width 100%
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values, min + 0.5);
  const xStep = width / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = i * xStep;
    const y = height - ((p.value - min) / (max - min)) * (height - 8) - 4;
    return [x, y] as const;
  });

  const linePath = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
        <path d={areaPath} fill={color} opacity={0.15} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
        {coords.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={1.6} fill={color} />
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-faint)", fontFamily: "JetBrains Mono, monospace" }}>
        <span>
          {min.toFixed(1)}
          {unit}
        </span>
        <span>
          {max.toFixed(1)}
          {unit}
        </span>
      </div>
    </div>
  );
}
