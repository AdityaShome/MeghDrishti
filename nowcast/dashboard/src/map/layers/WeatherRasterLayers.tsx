import { useMeghMap } from "../MapProvider";
import { useRasterLayer } from "../useRasterLayer";
import type { WeatherLayer } from "../../types";

export function WeatherRasterLayers({ layers, activeVar }: { layers: WeatherLayer[] | null; activeVar: string }) {
  const { map } = useMeghMap();
  const byId = Object.fromEntries((layers ?? []).map((l) => [l.id, l]));

  useRasterLayer(map, "layer-temperature", byId.temperature?.image, byId.temperature?.bbox, {
    opacity: 0.55,
    visible: activeVar === "temperature",
    beforeId: "heat-hail",
  });
  useRasterLayer(map, "layer-humidity", byId.humidity?.image, byId.humidity?.bbox, {
    opacity: 0.55,
    visible: activeVar === "humidity",
    beforeId: "heat-hail",
  });
  useRasterLayer(map, "layer-wind_speed", byId.wind_speed?.image, byId.wind_speed?.bbox, {
    opacity: 0.55,
    visible: activeVar === "wind_speed",
    beforeId: "heat-hail",
  });

  return null;
}
