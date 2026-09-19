import { useEffect, useRef } from "react";
import { Popup, type GeoJSONSource } from "maplibre-gl";
import type { Point } from "geojson";
import { useMeghMap } from "../MapProvider";
import { colorForHazards, HAZARD_COLOR_RGB } from "../../lib/colors";
import type { HazardsResponse, HazardFeature } from "../../types";

const HEAT_SPECS = [
  { id: "hail", color: HAZARD_COLOR_RGB.hail, weightField: "reflectivity_dbz", weightMax: 65 },
  { id: "downburst", color: HAZARD_COLOR_RGB.downburst, weightField: "velocity_delta_ms", weightMax: 45 },
  { id: "cloudburst", color: HAZARD_COLOR_RGB.cloudburst, weightField: "rainrate_mm_hr", weightMax: 120 },
] as const;

const EMPTY_FC = { type: "FeatureCollection" as const, features: [] as HazardFeature[] };

/** Grid-cell hazards render as heatmaps (density, weighted by the underlying
 * physical value) instead of stacked point markers — hundreds of overlapping
 * circles for a single storm reads as fake; a heatmap reads like a real
 * radar/hazard product. Station-level hazards (lightning, point hail flags)
 * are genuinely discrete points, so those stay as clickable circle markers. */
export function HazardLayers({ hazards }: { hazards: HazardsResponse | null }) {
  const { map, ready } = useMeghMap();
  const popupRef = useRef<Popup | null>(null);

  useEffect(() => {
    if (!map || !ready) return;
    if (map.getSource("stations")) return; // already set up

    for (const spec of HEAT_SPECS) {
      map.addSource(`cells-${spec.id}`, { type: "geojson", data: EMPTY_FC });
      map.addLayer({
        id: `heat-${spec.id}`,
        type: "heatmap",
        source: `cells-${spec.id}`,
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", spec.weightField], 0, 0, spec.weightMax, 1],
          "heatmap-intensity": 1.1,
          "heatmap-radius": 26,
          "heatmap-opacity": 0.8,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, `rgba(${spec.color},0)`,
            0.3, `rgba(${spec.color},0.35)`,
            0.6, `rgba(${spec.color},0.65)`,
            1, `rgba(${spec.color},0.95)`,
          ],
        },
      });
    }

    map.addSource("stations", { type: "geojson", data: EMPTY_FC });
    map.addLayer({
      id: "station-glow",
      type: "circle",
      source: "stations",
      paint: { "circle-radius": 16, "circle-color": ["get", "color"], "circle-opacity": 0.18, "circle-blur": 0.6 },
    });
    map.addLayer({
      id: "station-dot",
      type: "circle",
      source: "stations",
      paint: {
        "circle-radius": 6,
        "circle-color": ["get", "color"],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#0a0e16",
      },
    });

    map.on("mouseenter", "station-dot", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "station-dot", () => (map.getCanvas().style.cursor = ""));
    map.on("click", "station-dot", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const p = f.properties as Record<string, string>;
      const hazardList = JSON.parse(p.hazards_json) as { type: string; severity: string }[];
      const rows = hazardList.map((h) => `<div class="popup-row"><b>${h.type}</b> — ${h.severity}</div>`).join("");
      popupRef.current?.remove();
      popupRef.current = new Popup({ closeButton: true, offset: 10 })
        .setLngLat((f.geometry as Point).coordinates as [number, number])
        .setHTML(
          `<div class="popup-title">${p.name || p.station_id}</div>${rows}
           <div class="popup-row">Severity: ${p.ts_severity || "—"}</div>
           <div class="popup-row">Lightning cat: ${p.lightning_prob_cat || "—"}</div>`,
        )
        .addTo(map);
    });
  }, [map, ready]);

  useEffect(() => {
    if (!map || !ready || !hazards) return;

    const stationFeatures: HazardFeature[] = [];
    const cellsByType: Record<string, HazardFeature[]> = { hail: [], downburst: [], cloudburst: [] };

    for (const f of hazards.features) {
      if (f.properties.station_id) {
        stationFeatures.push({
          ...f,
          properties: {
            ...f.properties,
            // @ts-expect-error -- runtime-only fields consumed by paint expressions, not in the shared type
            color: colorForHazards(f.properties.hazards),
            hazards_json: JSON.stringify(f.properties.hazards),
          },
        });
      } else {
        for (const h of f.properties.hazards) {
          if (cellsByType[h.type]) {
            cellsByType[h.type].push({ ...f, properties: { ...f.properties, ...h } });
          }
        }
      }
    }

    (map.getSource("stations") as GeoJSONSource)?.setData({ type: "FeatureCollection", features: stationFeatures });
    for (const type of Object.keys(cellsByType)) {
      (map.getSource(`cells-${type}`) as GeoJSONSource)?.setData({
        type: "FeatureCollection",
        features: cellsByType[type],
      });
    }
  }, [map, ready, hazards]);

  return null;
}
