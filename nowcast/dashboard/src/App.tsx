import { useEffect, useState } from "react";
import { MapProvider, useMeghMap } from "./map/MapProvider";
import { ReferenceLabels } from "./map/layers/ReferenceLabels";
import { HazardLayers } from "./map/layers/HazardLayers";
import { SensorRasterLayers } from "./map/layers/SensorRasterLayers";
import { WeatherRasterLayers } from "./map/layers/WeatherRasterLayers";
import { WindArrows } from "./map/layers/WindArrows";
import { ModelFrameLayer } from "./map/layers/ModelFrameLayer";
import { RegionBox } from "./map/layers/RegionBox";
import { useRegionClick } from "./map/useRegionClick";

import { TopBar } from "./components/TopBar";
import { Banner } from "./components/Banner";
import { StatusBar } from "./components/StatusBar";
import { StormCellsPanel } from "./components/StormCellsPanel";
import { HazardLegendCard } from "./components/HazardLegendCard";
import { ModelCard } from "./components/ModelCard";
import { WeatherVariablesCard } from "./components/WeatherVariablesCard";
import { RegionCard } from "./components/RegionCard";
import { TimelineCard } from "./components/TimelineCard";

import { api, API_BASE } from "./api";
import { useHazards, useStormEta, useRawLayers, useForecastSummary, useNowcastFrame, useLazyWeatherLayers, useLazyWindVectors } from "./hooks/useNowcastData";
import type { ModelId, StormCell, RegionForecast, HazardsResponse, RawLayer, WeatherLayer, WindPoint, NowcastFrame } from "./types";

type VarId = "none" | "temperature" | "humidity" | "wind_speed";
const REGION_TREND_LEADS = [0, 60, 120, 180, 240, 300, 360];

function Dashboard() {
  const { map, tileError } = useMeghMap();

  const [leadMinutes, setLeadMinutes] = useState(0);
  const [model, setModel] = useState<ModelId>("pysteps");
  const [satelliteVisible, setSatelliteVisible] = useState(true);
  const [radarVisible, setRadarVisible] = useState(true);
  const [modelFrameVisible, setModelFrameVisible] = useState(true);
  const [activeVar, setActiveVar] = useState<VarId>("none");
  const [region, setRegion] = useState<{ lat: number; lon: number } | null>(null);
  const [regionLeadMinutes, setRegionLeadMinutes] = useState(0);
  const [regionReading, setRegionReading] = useState<RegionForecast | null>(null);
  const [regionTrend, setRegionTrend] = useState<RegionForecast[] | null>(null);
  const [apiUnreachable, setApiUnreachable] = useState(false);

  const hazards = useHazards(leadMinutes);
  const stormEta = useStormEta();
  const rawLayers = useRawLayers();
  const forecastSummary = useForecastSummary(model);
  const nowcastFrame = useNowcastFrame(model, leadMinutes, modelFrameVisible);
  const weatherLayers = useLazyWeatherLayers();
  const windVectors = useLazyWindVectors();

  useEffect(() => {
    setApiUnreachable(Boolean(hazards.error && hazards.error.includes("Failed to fetch")));
  }, [hazards.error]);

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

  useRegionClick((lat, lon) => selectRegion(lat, lon));

  async function selectRegion(lat: number, lon: number) {
    setRegion({ lat, lon });
    setRegionLeadMinutes(0);
    setRegionReading(null);
    setRegionTrend(null);
    map?.flyTo({ center: [lon, lat], zoom: Math.min((map.getZoom() ?? 10) + 1.6, 13), duration: 800 });

    try {
      const reading = await api.regionForecast(lat, lon, 0);
      setRegionReading(reading);
      const trend = await Promise.all(REGION_TREND_LEADS.map((m) => api.regionForecast(lat, lon, m)));
      setRegionTrend(trend);
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

  function onStormCellSelect(cell: StormCell) {
    map?.flyTo({ center: [cell.lon, cell.lat], zoom: 12, duration: 700 });
  }

  const activeMeta = activeVar !== "none" ? weatherLayers.data?.layers.find((l) => l.id === activeVar) ?? null : null;
  const dgmrUnavailable = forecastSummary.data?.available === false;
  const banner = tileError ?? (apiUnreachable ? `Can't reach the backend at ${API_BASE} — start it with: uvicorn nowcast.api.main:app --port 8000` : null);

  return (
    <>
      <MapLayers
        hazards={hazards.data ?? null}
        rawLayers={rawLayers.data?.layers ?? null}
        satelliteVisible={satelliteVisible}
        radarVisible={radarVisible}
        weatherLayers={weatherLayers.data?.layers ?? null}
        activeVar={activeVar}
        windPoints={windVectors.data?.points ?? null}
        modelFrame={nowcastFrame.data ?? null}
        modelFrameVisible={modelFrameVisible}
        region={region}
      />

      <TopBar />
      <StormCellsPanel cells={stormEta.data?.cells ?? null} loading={stormEta.loading} onSelect={onStormCellSelect} />

      <div className="right-rail">
        <HazardLegendCard
          satelliteVisible={satelliteVisible}
          onSatelliteToggle={setSatelliteVisible}
          radarVisible={radarVisible}
          onRadarToggle={setRadarVisible}
        />
        <ModelCard
          model={model}
          onModelChange={setModel}
          frameVisible={modelFrameVisible}
          onFrameVisibleChange={setModelFrameVisible}
          dgmrUnavailable={dgmrUnavailable}
        />
        <WeatherVariablesCard activeVar={activeVar} onChange={setActiveVar} meta={activeMeta} />
        <RegionCard
          region={region}
          reading={regionReading}
          trend={regionTrend}
          leadMinutes={regionLeadMinutes}
          onLeadChange={onRegionLeadChange}
          onClose={() => setRegion(null)}
        />
      </div>

      {!region && <div className="region-hint">Click anywhere on the map to inspect a region</div>}

      <TimelineCard model={model} leadMinutes={leadMinutes} onLeadChange={setLeadMinutes} />

      <StatusBar
        ok={!hazards.error && !stormEta.error}
        message={hazards.error ? `API error: ${hazards.error}` : `updated ${new Date().toLocaleTimeString()}`}
      />

      <Banner message={banner} />
    </>
  );
}

function MapLayers(props: {
  hazards: HazardsResponse | null;
  rawLayers: RawLayer[] | null;
  satelliteVisible: boolean;
  radarVisible: boolean;
  weatherLayers: WeatherLayer[] | null;
  activeVar: VarId;
  windPoints: WindPoint[] | null;
  modelFrame: NowcastFrame | null;
  modelFrameVisible: boolean;
  region: { lat: number; lon: number } | null;
}) {
  return (
    <>
      <HazardLayers hazards={props.hazards} />
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
