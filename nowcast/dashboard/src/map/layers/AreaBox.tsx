import { useEffect } from "react";
import type { GeoJSONSource } from "maplibre-gl";
import type { FeatureCollection } from "geojson";
import { useMeghMap } from "../MapProvider";
import type { Bbox } from "../../types";

function bboxPolygon(bbox: Bbox): FeatureCollection {
  const [lonMin, latMin, lonMax, latMax] = bbox;
  const coords = [
    [lonMin, latMax],
    [lonMax, latMax],
    [lonMax, latMin],
    [lonMin, latMin],
    [lonMin, latMax],
  ];
  return { type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Polygon", coordinates: [coords] }, properties: {} }] };
}

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

/** User drag-drawn area selection — a live dashed preview while dragging,
 * then a solid box once confirmed. Separate source/layer from RegionBox
 * (the fixed-size click-to-inspect box) since both can't share one style. */
export function AreaBox({ drawing, selected }: { drawing: Bbox | null; selected: Bbox | null }) {
  const { map, ready } = useMeghMap();

  useEffect(() => {
    if (!map || !ready || map.getSource("area-box")) return;
    map.addSource("area-box", { type: "geojson", data: EMPTY });
    map.addLayer({
      id: "area-box-fill",
      type: "fill",
      source: "area-box",
      paint: { "fill-color": "#3fb6ff", "fill-opacity": 0.08 },
    });
    map.addLayer({
      id: "area-box-line",
      type: "line",
      source: "area-box",
      paint: { "line-color": "#3fb6ff", "line-width": 2, "line-opacity": 0.9 },
    });
  }, [map, ready]);

  useEffect(() => {
    if (!map || !ready) return;
    const source = map.getSource("area-box") as GeoJSONSource | undefined;
    if (!source) return;
    const active = drawing ?? selected;
    source.setData(active ? bboxPolygon(active) : EMPTY);
    if (map.getLayer("area-box-line")) {
      map.setPaintProperty("area-box-line", "line-dasharray", drawing ? [2, 2] : [1, 0]);
    }
  }, [map, ready, drawing, selected]);

  return null;
}
