"""IMD district/station nowcast puller (section 2a of project.md).

Writes normalized JSON to data/imd/<timestamp>.json:
    {station_id, lat, lon, timestamp, ts_severity, lightning_prob_cat, hail_flag, ...}

USE_LIVE_IMD=false (default): generates a plausible replay/mock feed so the
rest of the pipeline (fusion, hazards, API, dashboard) is fully runnable
without IMD credentials, per the fallback matrix. Swap in the real
api.imd.gov.in call by filling in `_fetch_live` — the output schema below is
the contract the rest of the system depends on, keep it stable.
"""
import json
import math
import os
import random
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from nowcast.configs.settings import REGION_BBOX, IMD_DIR, USE_LIVE_IMD, IMD_API_KEY
from nowcast.processing.storm_track import center_at

STATIONS = [
    {"station_id": "PUN001", "name": "Pune City", "lat": 18.52, "lon": 73.86},
    {"station_id": "PUN002", "name": "Pimpri-Chinchwad", "lat": 18.63, "lon": 73.80},
    {"station_id": "PUN003", "name": "Lonavala", "lat": 18.75, "lon": 73.41},
    {"station_id": "PUN004", "name": "Baramati", "lat": 18.15, "lon": 74.58},
    {"station_id": "PUN005", "name": "Khadakwasla", "lat": 18.44, "lon": 73.77},
    {"station_id": "PUN006", "name": "Storm-adjacent AWS", "lat": 18.32, "lon": 73.68},
]

LIGHTNING_CATS = {"cat6": 0.15, "cat11": 0.45, "cat19": 0.75}


def _km_from_storm_core(lat, lon, t_min=0):
    c_lat, c_lon = center_at(t_min)
    km_per_deg_lat = 111.0
    km_per_deg_lon = 111.0 * math.cos(math.radians(c_lat))
    dy = (lat - c_lat) * km_per_deg_lat
    dx = (lon - c_lon) * km_per_deg_lon
    return math.hypot(dx, dy)


def _fetch_live():
    """Real api.imd.gov.in call. Not implemented — needs IMD_API_KEY + docs.

    Raises so callers fall back to mock rather than silently serving stale
    data; fill this in once IMD API access (section 1, item 2) is approved.
    """
    raise NotImplementedError("Set USE_LIVE_IMD=true only after implementing this call")


def _fetch_mock():
    """Lightning/thunderstorm activity is weighted by proximity to the
    synthetic storm core (storm_track) rather than drawn independently per
    station — real convective lightning clusters around the storm cell, it
    doesn't fire uniformly at random across the district network. Stations
    far from the core still get a background chance of isolated activity
    (scattered convection elsewhere in the demo region), which is realistic
    and keeps the feed from being *only* the one storm.
    """
    now = datetime.now(timezone.utc).isoformat()
    records = []
    for st in STATIONS:
        dist_km = _km_from_storm_core(st["lat"], st["lon"])
        proximity = math.exp(-(dist_km**2) / (2 * 15.0**2))  # ~15km influence radius

        if proximity > 0.6:
            weights = [0.05, 0.25, 0.70]   # near-core: mostly cat19
        elif proximity > 0.2:
            weights = [0.2, 0.5, 0.3]      # transition zone
        else:
            weights = [0.7, 0.25, 0.05]    # background: mostly low cat

        cat = random.choices(list(LIGHTNING_CATS.keys()), weights=weights)[0]
        severity = random.choice(["nil", "isolated", "scattered", "widespread"])
        hail_flag = cat == "cat19" and random.random() < (0.6 if proximity > 0.6 else 0.1)
        records.append(
            {
                "station_id": st["station_id"],
                "name": st["name"],
                "lat": st["lat"],
                "lon": st["lon"],
                "timestamp": now,
                "ts_severity": severity,
                "lightning_prob_cat": cat,
                "lightning_prob": LIGHTNING_CATS[cat],
                "hail_flag": hail_flag,
                "source": "mock-replay",
            }
        )
    return records


def pull():
    os.makedirs(IMD_DIR, exist_ok=True)
    try:
        records = _fetch_live() if USE_LIVE_IMD else _fetch_mock()
    except Exception as exc:
        print(f"[imd_nowcast] live fetch failed ({exc}), falling back to mock", file=sys.stderr)
        records = _fetch_mock()

    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_path = os.path.join(IMD_DIR, f"{ts}.json")
    with open(out_path, "w") as f:
        json.dump({"bbox": REGION_BBOX, "records": records}, f, indent=2)
    print(f"[imd_nowcast] wrote {len(records)} records -> {out_path}")
    return out_path


if __name__ == "__main__":
    pull()
