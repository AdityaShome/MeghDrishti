import { useEffect, useRef, useState } from "react";
import { MapProvider, MapCanvas, useMeghMap } from "./map/MapProvider";
import { ReferenceLabels } from "./map/layers/ReferenceLabels";
import { HazardLayers } from "./map/layers/HazardLayers";
import { SensorRasterLayers } from "./map/layers/SensorRasterLayers";
import { WeatherRasterLayers } from "./map/layers/WeatherRasterLayers";
import { WindArrows } from "./map/layers/WindArrows";
import { ModelFrameLayer } from "./map/layers/ModelFrameLayer";
import { RegionBox } from "./map/layers/RegionBox";
import { WmsBaseLayer } from "./map/layers/WmsBaseLayer";
import { WmsOverlayLayers } from "./map/layers/WmsOverlayLayers";
import { useRegionClick } from "./map/useRegionClick";

import { TopBar } from "./components/TopBar";
import { Banner } from "./components/Banner";
import { LeftNavigation } from "./components/LeftNavigation";
import { HazardsPage } from "./components/HazardsPage";
import { LeftSidebar } from "./components/LeftSidebar";
import { RightSidebar } from "./components/RightSidebar";
import { BottomPanel } from "./components/BottomPanel";
import { LayersDrawer } from "./components/LayersDrawer";
import { RegionFloating } from "./components/RegionFloating";
import { Play, Pause } from "lucide-react";

import { api, API_BASE } from "./api";
import {
  useHazards,
  useStormEta,
  useRawLayers,
  useForecastSummary,
  useNowcastFrame,
  useLazyWeatherLayers,
  useLazyWindVectors,
} from "./hooks/useNowcastData";
import type { ModelId, RegionForecast, HazardsResponse, RawLayer, WeatherLayer, WindPoint, NowcastFrame } from "./types";

type VarId = "none" | "temperature" | "humidity" | "wind_speed";

const LEAD_MAX = { pysteps: 360, dgmr: 90 } as const;

function Dashboard() {
  const { map, tileError } = useMeghMap();

  const [leadMinutes, setLeadMinutes] = useState(0);
  const [model, setModel] = useState<ModelId>("pysteps");
  const [satelliteVisible, setSatelliteVisible] = useState(true);
  const [radarVisible, setRadarVisible] = useState(true);
  const [heatmapsVisible, setHeatmapsVisible] = useState(true);
  const [stationsVisible, setStationsVisible] = useState(true);
  const [modelFrameVisible, setModelFrameVisible] = useState(true);
  const [activeVar, setActiveVar] = useState<VarId>("none");
  const [baseMapId, setBaseMapId] = useState("none");
  const [activeOverlayIds, setActiveOverlayIds] = useState<Set<string>>(new Set());
  const [region, setRegion] = useState<{ lat: number; lon: number } | null>(null);
  const [regionLeadMinutes, setRegionLeadMinutes] = useState(0);
  const [regionReading, setRegionReading] = useState<RegionForecast | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const [hazardsOpen, setHazardsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [apiUnreachable, setApiUnreachable] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const hazards = useHazards(leadMinutes);
  const stormEta = useStormEta();
  const rawLayers = useRawLayers();
  const forecastSummary = useForecastSummary(model);
  const nowcastFrame = useNowcastFrame(model, leadMinutes, modelFrameVisible);
  const weatherLayers = useLazyWeatherLayers();
  const windVectors = useLazyWindVectors();

  useEffect(() => {
    setApiUnreachable(Boolean(hazards.error && hazards.error.includes("Failed to fetch")));
    if (!hazards.error) setLastUpdated(new Date());
  }, [hazards.error, hazards.data]);

  // reset to a clean lead-time position whenever the model changes, since
  // DGMR's horizon (90min) is shorter than pySTEPS' (6h)
  useEffect(() => {
    setLeadMinutes(0);
  }, [model]);

  useEffect(() => {
    if (activeVar !== "none") weatherLayers.load();
    if (activeVar === "wind_speed") windVectors.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVar]);

  // simple auto-play: advance the lead-time slider one step per second
  const playRef = useRef({ model, leadMinutes });
  playRef.current = { model, leadMinutes };
  useEffect(() => {
    if (!isPlaying) return;
    const step = model === "dgmr" ? 15 : 60;
    const id = setInterval(() => {
      const { model: m, leadMinutes: cur } = playRef.current;
      const max = LEAD_MAX[m];
      setLeadMinutes(cur + step > max ? 0 : cur + step);
    }, 1000);
    return () => clearInterval(id);
  }, [isPlaying, model]);

  useRegionClick((lat, lon) => selectRegion(lat, lon));

  async function selectRegion(lat: number, lon: number) {
    setRegion({ lat, lon });
    setRegionLeadMinutes(0);
    setRegionReading(null);
    map?.flyTo({ center: [lon, lat], zoom: Math.min((map.getZoom() ?? 10) + 1.6, 13), duration: 800 });
    try {
      const reading = await api.regionForecast(lat, lon, 0);
      setRegionReading(reading);
    } catch {
      // region panel just stays in its loading state; not worth a banner for this
    }
  }

  async function onRegionLeadChange(m: number) {
    setRegionLeadMinutes(m);
    if (!region) return;
    try {
      const reading = await api.regionForecast(region.lat, region.lon, m);
      setRegionReading(reading);
    } catch {
      /* keep last known reading on transient failure */
    }
  }

  function toggleOverlay(id: string) {
    setActiveOverlayIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const activeMeta = activeVar !== "none" ? weatherLayers.data?.layers.find((l) => l.id === activeVar) ?? null : null;
  const dgmrUnavailable = forecastSummary.data?.available === false;
  const apiOk = !apiUnreachable && !hazards.error;
  const banner =
    tileError ?? (apiUnreachable ? `Can't reach the backend at ${API_BASE} — start it with: uvicorn nowcast.api.main:app --port 8000` : null);

  const leadLabel = leadMinutes === 0 ? "Now" : `+${Math.floor(leadMinutes / 60)}h ${leadMinutes % 60}m`;

  return (
    <div className="app-shell">
      <LeftNavigation
        layersOpen={layersOpen}
        onToggleLayers={() => setLayersOpen((v) => !v)}
        hazardsOpen={hazardsOpen}
        onToggleHazards={() => setHazardsOpen((v) => !v)}
      />

      <div className="app-content">
        <TopBar apiOk={apiOk} lastUpdated={lastUpdated} />

        <div className="main-body">
          {hazardsOpen && (
            <HazardsPage
              hazards={hazards.data ?? null}
              stormCells={stormEta.data?.cells ?? null}
              onClose={() => setHazardsOpen(false)}
              onSelectLocation={(lat, lon) => {
                setHazardsOpen(false);
                selectRegion(lat, lon);
              }}
            />
          )}

          <LeftSidebar hazards={hazards.data ?? null} model={model} apiOk={apiOk} lastUpdated={lastUpdated} />

          <div className="map-area">
            <MapCanvas />
            <MapLayers
              hazards={hazards.data ?? null}
              heatmapsVisible={heatmapsVisible}
              stationsVisible={stationsVisible}
              rawLayers={rawLayers.data?.layers ?? null}
              satelliteVisible={satelliteVisible}
              radarVisible={radarVisible}
              weatherLayers={weatherLayers.data?.layers ?? null}
              activeVar={activeVar}
              windPoints={windVectors.data?.points ?? null}
              modelFrame={nowcastFrame.data ?? null}
              modelFrameVisible={modelFrameVisible}
              region={region}
              baseMapId={baseMapId}
              activeOverlayIds={activeOverlayIds}
            />

            {layersOpen && (
              <LayersDrawer
                onClose={() => setLayersOpen(false)}
                model={model}
                onModelChange={setModel}
                dgmrUnavailable={dgmrUnavailable}
                modelFrameVisible={modelFrameVisible}
                onModelFrameVisibleChange={setModelFrameVisible}
                baseMapId={baseMapId}
                onBaseMapChange={setBaseMapId}
                activeOverlayIds={activeOverlayIds}
                onOverlayToggle={toggleOverlay}
                activeVar={activeVar}
                onVarChange={setActiveVar}
                activeVarMeta={activeMeta}
              />
            )}

            <div className="map-controls-top">
              <div className="layer-toggles">
                <button className={`layer-btn ${radarVisible ? "active" : ""}`} onClick={() => setRadarVisible((v) => !v)}>
                  <div className={`status-dot ${radarVisible ? "ok" : ""}`} /> Radar
                </button>
                <button className={`layer-btn ${satelliteVisible ? "active" : ""}`} onClick={() => setSatelliteVisible((v) => !v)}>
                  <div className={`status-dot ${satelliteVisible ? "ok" : ""}`} /> Satellite (IR)
                </button>
                <button className={`layer-btn ${stationsVisible ? "active" : ""}`} onClick={() => setStationsVisible((v) => !v)}>
                  <div className={`status-dot ${stationsVisible ? "ok" : ""}`} /> Lightning
                </button>
                <button className={`layer-btn ${heatmapsVisible ? "active" : ""}`} onClick={() => setHeatmapsVisible((v) => !v)}>
                  <div className={`status-dot ${heatmapsVisible ? "ok" : ""}`} /> Hazards
                </button>
                <button
                  className={`layer-btn ${baseMapId === "dem" ? "active" : ""}`}
                  onClick={() => setBaseMapId((v) => (v === "dem" ? "none" : "dem"))}
                >
                  <div className={`status-dot ${baseMapId === "dem" ? "ok" : ""}`} /> Topography
                </button>
              </div>

              <div className="time-scrubber">
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#fff" }}>{leadLabel}</span>
                <div
                  className="icon-btn"
                  style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--accent)", color: "#000", border: "none", cursor: "pointer" }}
                  onClick={() => setIsPlaying((v) => !v)}
                >
                  {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                </div>
                <input
                  type="range"
                  min={0}
                  max={LEAD_MAX[model]}
                  step={model === "dgmr" ? 5 : 10}
                  value={Math.min(leadMinutes, LEAD_MAX[model])}
                  onChange={(e) => setLeadMinutes(parseInt(e.target.value, 10))}
                  style={{ width: 100 }}
                />
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#fff" }}>{model === "dgmr" ? "90m" : "6h"}</span>
              </div>
            </div>

            <div className="map-legends">
              <div className="panel-section" style={{ background: "var(--panel)", borderRadius: "12px", border: "1px solid var(--panel-border)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "8px", fontWeight: 600 }}>Radar Reflectivity (dBZ)</div>
                <div
                  style={{
                    height: "8px",
                    background: "linear-gradient(90deg, #102e85, #1461c2, #1bb55e, #c0da27, #f7981b, #eb1b1e, #d715d0)",
                    borderRadius: "4px",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", marginTop: "4px", color: "var(--text-faint)", fontFamily: "'JetBrains Mono', monospace" }}>
                  <span>10</span>
                  <span>20</span>
                  <span>30</span>
                  <span>40</span>
                  <span>50</span>
                  <span>60</span>
                  <span>70</span>
                </div>
              </div>

              <div className="panel-section" style={{ background: "var(--panel)", borderRadius: "12px", border: "1px solid var(--panel-border)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "8px", fontWeight: 600 }}>Hazard Zones</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "10px", fontWeight: 500 }}>
                    <div style={{ width: 10, height: 10, background: "var(--hail)", border: "1px solid #fff", borderRadius: "2px" }} /> Hail
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "10px", fontWeight: 500 }}>
                    <div style={{ width: 10, height: 10, background: "var(--lightning)", border: "1px solid #fff", borderRadius: "2px" }} /> Lightning
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "10px", fontWeight: 500 }}>
                    <div style={{ width: 10, height: 10, background: "var(--downburst)", border: "1px solid #fff", borderRadius: "2px" }} /> Downburst
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "10px", fontWeight: 500 }}>
                    <div style={{ width: 10, height: 10, background: "var(--cloudburst)", border: "1px solid #fff", borderRadius: "2px" }} /> Cloudburst
                  </div>
                </div>
              </div>
            </div>

            {region ? (
              <RegionFloating
                region={region}
                reading={regionReading}
                leadMinutes={regionLeadMinutes}
                onLeadChange={onRegionLeadChange}
                onClose={() => setRegion(null)}
              />
            ) : (
              <div className="region-hint">Click anywhere on the map to inspect a region</div>
            )}

            <Banner message={banner} />
          </div>

          <RightSidebar stormCells={stormEta.data?.cells ?? null} forecast={forecastSummary.data ?? null} />
        </div>

        <BottomPanel model={model} leadMinutes={leadMinutes} onLeadChange={setLeadMinutes} forecast={forecastSummary.data ?? null} hazards={hazards.data ?? null} />
      </div>
    </div>
  );
}

function MapLayers(props: {
  hazards: HazardsResponse | null;
  heatmapsVisible: boolean;
  stationsVisible: boolean;
  rawLayers: RawLayer[] | null;
  satelliteVisible: boolean;
  radarVisible: boolean;
  weatherLayers: WeatherLayer[] | null;
  activeVar: VarId;
  windPoints: WindPoint[] | null;
  modelFrame: NowcastFrame | null;
  modelFrameVisible: boolean;
  region: { lat: number; lon: number } | null;
  baseMapId: string;
  activeOverlayIds: Set<string>;
}) {
  return (
    <>
      <WmsBaseLayer selectedId={props.baseMapId} />
      <HazardLayers hazards={props.hazards} heatmapsVisible={props.heatmapsVisible} stationsVisible={props.stationsVisible} />
      <WmsOverlayLayers activeIds={props.activeOverlayIds} />
      <SensorRasterLayers layers={props.rawLayers} satelliteVisible={props.satelliteVisible} radarVisible={props.radarVisible} />
      <WeatherRasterLayers layers={props.weatherLayers} activeVar={props.activeVar} />
      <WindArrows points={props.windPoints} visible={props.activeVar === "wind_speed"} />
      <ModelFrameLayer frame={props.modelFrame} visible={props.modelFrameVisible} />
      <RegionBox region={props.region} />
      <ReferenceLabels />
    </>
  );
}

export default function App() {
  return (
    <MapProvider>
      <Dashboard />
    </MapProvider>
  );
}
