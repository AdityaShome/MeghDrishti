"""Real hail + lightning hazard detection across all of India.

Unlike the per-region demo (models/hazard.py + processing/synthetic_radar.py,
still used by the Forecast/Replay pages), this has no synthetic storm and no
fixed demo city — it looks at real RainViewer reflectivity and real
Blitzortung lightning strikes across the whole country and flags wherever
they actually indicate hail-favorable conditions or a strike, right now.

Downburst (needs Doppler radial velocity — no public source publishes raw
volumetric scans) and cloudburst (needs a persisted real radar time-series
for pySTEPS to extrapolate from, which a single "now" RainViewer frame per
cycle doesn't provide) have no real all-India equivalent. Rather than fake
either at country scale, both are simply absent from this module's output —
they remain available, synthetic-backed, in the per-region demo.

Hail rule here is simplified from hazard.py's grid rule: reflectivity +
collocated real lightning only, no cold-cloud-top requirement. Real
satellite coverage (Copernicus Sentinel-3's polar orbit, EUMETSAT pending
license) isn't available everywhere in India at once, so requiring it would
make hail flicker on/off based on incidental satellite coverage rather than
actual storm severity — reflectivity + lightning is still a real,
non-synthetic signal on its own.
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from nowcast.configs.settings import INDIA_BBOX, HAIL_REFLECTIVITY_MIN_DBZ

INDIA_GRID_SIZE = 150  # ~0.2deg/cell, ~22km — fine enough for a country overview
LIGHTNING_PROXIMITY_KM = 25.0  # collocated-with-lightning bumps hail severity to "high"


def _km_per_deg(lat):
    return 111.0, 111.0 * np.cos(np.radians(lat))


def detect(reflectivity=None, strikes=None):
    """Real hail + lightning hazard points across all of India.

    `reflectivity`/`strikes` can be pre-fetched and passed in (main.py does
    this, sharing one RainViewer/Blitzortung fetch between hazard detection
    and the /raw-layers all-India radar image instead of fetching twice) —
    left as None, this fetches them itself, so the module stays runnable
    standalone via `python -m nowcast.models.hazard_india`.

    Returns a list of {lat, lon, type, severity, ...} dicts. Raises if the
    radar fetch itself fails (no data at all to work with) — callers should
    treat that like any other live-source failure. A failed *lightning*
    fetch is non-fatal: hail detection still runs on reflectivity alone,
    just without the lightning-proximity severity bump, and simply
    contributes no lightning hazard points itself.
    """
    if reflectivity is None:
        from nowcast.ingestion.rainviewer_radar import fetch_india_reflectivity

        reflectivity = fetch_india_reflectivity(INDIA_GRID_SIZE)

    if strikes is None:
        try:
            from nowcast.ingestion.blitzortung_lightning import fetch_india_strikes

            strikes = fetch_india_strikes()
        except Exception as exc:
            print(f"[hazard_india] lightning fetch failed ({exc}), hail runs on reflectivity alone")
            strikes = []

    lon_min, lat_min, lon_max, lat_max = INDIA_BBOX
    lons = np.linspace(lon_min, lon_max, INDIA_GRID_SIZE)
    lats = np.linspace(lat_min, lat_max, INDIA_GRID_SIZE)
    lon_grid, lat_grid = np.meshgrid(lons, lats)

    hazards = []

    for s in strikes:
        hazards.append({"lat": s["lat"], "lon": s["lon"], "type": "lightning", "severity": "moderate"})

    ys, xs = np.where(reflectivity >= HAIL_REFLECTIVITY_MIN_DBZ)
    for y, x in zip(ys.tolist(), xs.tolist()):
        cell_lat, cell_lon = float(lat_grid[y, x]), float(lon_grid[y, x])
        severity = "moderate"
        if strikes:
            km_lat, km_lon = _km_per_deg(cell_lat)
            nearest_km = min(
                np.hypot((cell_lat - s["lat"]) * km_lat, (cell_lon - s["lon"]) * km_lon) for s in strikes
            )
            if nearest_km <= LIGHTNING_PROXIMITY_KM:
                severity = "high"
        hazards.append(
            {
                "lat": cell_lat,
                "lon": cell_lon,
                "type": "hail",
                "severity": severity,
                "reflectivity_dbz": round(float(reflectivity[y, x]), 1),
            }
        )

    return hazards


if __name__ == "__main__":
    result = detect()
    hail = [h for h in result if h["type"] == "hail"]
    lightning = [h for h in result if h["type"] == "lightning"]
    print(f"{len(hail)} hail point(s), {len(lightning)} lightning strike(s) across India right now")
    for h in hail[:5]:
        print(h)
