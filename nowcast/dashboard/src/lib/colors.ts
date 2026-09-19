import type { Bbox, Hazard, HazardType } from "../types";

export const HAZARD_COLOR: Record<HazardType, string> = {
  hail: "#b565f5",
  downburst: "#f5486b",
  cloudburst: "#2fb0e0",
  lightning: "#f0b429",
};

export const HAZARD_COLOR_RGB: Record<Exclude<HazardType, "lightning">, string> = {
  hail: "182,101,245",
  downburst: "245,72,107",
  cloudburst: "47,176,224",
};

export function colorForHazards(hazards: Hazard[]): string {
  if (hazards.some((h) => h.type === "downburst")) return HAZARD_COLOR.downburst;
  if (hazards.some((h) => h.type === "hail")) return HAZARD_COLOR.hail;
  if (hazards.some((h) => h.type === "cloudburst")) return HAZARD_COLOR.cloudburst;
  return HAZARD_COLOR.lightning;
}

export const VAR_COLOR_STOPS: Record<string, [string, string, string]> = {
  temperature: ["#3fb6ff", "#f0b429", "#f5486b"],
  humidity: ["#f5f0c8", "#4fb5d6", "#1c4e8a"],
  wind_speed: ["#2a1a5e", "#b53f92", "#f0b429"],
};

export function lerpColor(stops: readonly string[], t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const seg = clamped * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(seg));
  const localT = seg - i;
  const c1 = hexToRgb(stops[i]);
  const c2 = hexToRgb(stops[i + 1]);
  const rgb = c1.map((v, k) => Math.round(v + (c2[k] - v) * localT));
  return `rgb(${rgb.join(",")})`;
}

function hexToRgb(hex: string): number[] {
  const matches = hex.match(/\w\w/g) ?? [];
  return matches.map((h) => parseInt(h, 16));
}

export function bboxToCoords(bbox: Bbox): [[number, number], [number, number], [number, number], [number, number]] {
  const [lonMin, latMin, lonMax, latMax] = bbox;
  return [
    [lonMin, latMax],
    [lonMax, latMax],
    [lonMax, latMin],
    [lonMin, latMin],
  ];
}

export function windCompass(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}
