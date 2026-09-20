import type {
  HazardsResponse,
  StormEtaResponse,
  RawLayersResponse,
  WeatherLayersResponse,
  WindVectorsResponse,
  RegionForecast,
  ForecastSummary,
  NowcastFrame,
  ModelId,
  HistoryTimestampsResponse,
  HistoryHazardsResponse,
} from "./types";

export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

class ApiError extends Error {
  path: string;
  status: number;

  constructor(path: string, status: number) {
    super(`${path} -> ${status}`);
    this.path = path;
    this.status = status;
  }
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(API_BASE + path);
  if (!res.ok) throw new ApiError(path, res.status);
  return (await res.json()) as T;
}

export const api = {
  health: () => getJSON<{ status: string; loaded_from: string | null }>("/health"),
  hazards: (leadMinutes: number) => getJSON<HazardsResponse>(`/hazards?lead_time=${leadMinutes}`),
  stormEta: () => getJSON<StormEtaResponse>("/storm-eta"),
  rawLayers: () => getJSON<RawLayersResponse>("/raw-layers"),
  weatherLayers: () => getJSON<WeatherLayersResponse>("/weather-layers"),
  windVectors: () => getJSON<WindVectorsResponse>("/wind-vectors"),
  regionForecast: (lat: number, lon: number, leadMinutes: number) =>
    getJSON<RegionForecast>(`/region-forecast?lat=${lat}&lon=${lon}&lead_time=${leadMinutes}`),
  forecast: (model: ModelId) => getJSON<ForecastSummary>(`/forecast?model=${model}`),
  nowcastFrame: (model: ModelId, leadMinutes: number) =>
    getJSON<NowcastFrame>(`/nowcast-frame?model=${model}&lead_time=${leadMinutes}`),
  historyTimestamps: () => getJSON<HistoryTimestampsResponse>("/history/timestamps"),
  historyHazards: (timestamp: string) => getJSON<HistoryHazardsResponse>(`/history/hazards?timestamp=${timestamp}`),
};

export { ApiError };
