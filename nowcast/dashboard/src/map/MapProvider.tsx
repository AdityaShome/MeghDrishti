import { useEffect, useRef, useState, type ReactNode } from "react";
import { Map as MaplibreMap, NavigationControl, type ErrorEvent, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapContext } from "./MapContext";

export { useMeghMap } from "./MapContext";

const STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "esri-dark-canvas": {
      type: "raster",
      tiles: ["https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Esri, HERE, Garmin, FAO, NOAA, USGS",
    },
    "esri-dark-reference": {
      type: "raster",
      tiles: ["https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
    },
  },
  layers: [
    { id: "bg-fallback", type: "background", paint: { "background-color": "#141c2b" } },
    { id: "esri-dark-canvas-layer", type: "raster", source: "esri-dark-canvas" },
  ],
};

export function MapProvider({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [tileError, setTileError] = useState<string | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MaplibreMap({
      container: containerRef.current,
      style: STYLE,
      center: [73.86, 18.5],
      zoom: 10.2,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");

    map.on("load", () => {
      // reference labels (roads/place names) sit above data layers, added after
      // everything else in the app registers its own layers via useEffect order
      setReady(true);
      forceRender((n) => n + 1);
    });

    let errorShown = false;
    map.on("error", (e: ErrorEvent) => {
      if (errorShown) return;
      errorShown = true;
      const message = (e.error && (e.error.message || e.error.toString())) || "unknown error";
      console.error("[map error]", message);
      setTileError(`Basemap tiles failed to load (network/firewall may be blocking arcgisonline.com): ${message}`);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <MapContext.Provider value={{ map: mapRef.current, ready, tileError }}>
      <div className="app-shell">
        {/* inline position/inset: maplibre-gl's own stylesheet sets
            `.maplibregl-map { position: relative }` on this same element
            (it adds that class itself), which otherwise wins over the
            `.map-root` class rule on import-order tie — inline styles beat
            any external stylesheet regardless of specificity/order. */}
        <div ref={containerRef} className="map-root" style={{ position: "absolute", inset: 0 }} />
        {children}
      </div>
    </MapContext.Provider>
  );
}
