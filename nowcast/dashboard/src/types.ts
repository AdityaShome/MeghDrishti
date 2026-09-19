// Types mirror the FastAPI backend's JSON responses (nowcast/api/main.py).
// Keep in sync manually — no shared schema generation in this project yet.

export type HazardType = "hail" | "downburst" | "cloudburst" | "lightning";
export type Severity = "moderate" | "high";

export interface Hazard {
  type: HazardType;
  severity: Severity;
  reflectivity_dbz?: number;
  velocity_delta_ms?: number;
  rainrate_mm_hr?: number;
}

export interface HazardFeatureProperties {
  station_id?: string;
  name?: string;
  hazards: Hazard[];
  ts_severity?: string;
  lightning_prob_cat?: string;
  timestamp?: string;
  lead_minutes?: number;
}

export interface HazardFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: HazardFeatureProperties;
}

export interface HazardsResponse {
  type: "FeatureCollection";
  features: HazardFeature[];
  lead_time_minutes: number;
}

export interface StormCell {
  station_id: string;
  name?: string;
  lat: number;
  lon: number;
  bearing_deg: number;
  speed_kmh: number;
  distance_km: number;
  eta_minutes: number;
  hazards: Hazard[];
  motion_source: string;
}

export interface StormEtaResponse {
  cells: StormCell[];
}

export type Bbox = [number, number, number, number];

export interface RawLayer {
  id: string;
  label: string;
  bbox: Bbox;
  image: string;
  source: string;
}

export interface RawLayersResponse {
  layers: RawLayer[];
  note: string;
}

export interface WeatherLayer {
  id: "temperature" | "humidity" | "wind_speed";
  label: string;
  unit: string;
  bbox: Bbox;
  vmin: number;
  vmax: number;
  image: string;
}

export interface WeatherLayersResponse {
  layers: WeatherLayer[];
  note: string;
}

export interface WindPoint {
  lat: number;
  lon: number;
  wind_speed_ms: number;
  wind_dir_deg: number;
}

export interface WindVectorsResponse {
  points: WindPoint[];
}

export interface RegionForecast {
  temperature_c: number;
  humidity_pct: number;
  wind_speed_ms: number;
  wind_dir_deg: number;
  lead_minutes: number;
  cloudburst_rainrate_mm_hr: number | null;
}

export type ModelId = "pysteps" | "dgmr";

export interface ForecastSummary {
  available: boolean;
  reason?: string;
  timestamps_min?: number[];
  max_rainrate_mm_hr?: number[];
  mean_rainrate_mm_hr?: number[];
  max_intensity?: number[];
  mean_intensity?: number[];
  bbox?: Bbox;
  source?: string;
  note?: string;
}

export interface NowcastFrame {
  available: boolean;
  reason?: string;
  image?: string;
  bbox?: Bbox;
  lead_minutes?: number;
  source?: string;
  note?: string;
}
