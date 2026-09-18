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
import os
import random
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from nowcast.configs.settings import REGION_BBOX, IMD_DIR, USE_LIVE_IMD, IMD_API_KEY

STATIONS = [
    {"station_id": "PUN001", "name": "Pune City", "lat": 18.52, "lon": 73.86},
    {"station_id": "PUN002", "name": "Pimpri-Chinchwad", "lat": 18.63, "lon": 73.80},
    {"station_id": "PUN003", "name": "Lonavala", "lat": 18.75, "lon": 73.41},
    {"station_id": "PUN004", "name": "Baramati", "lat": 18.15, "lon": 74.58},
    {"station_id": "PUN005", "name": "Khadakwasla", "lat": 18.44, "lon": 73.77},
]

LIGHTNING_CATS = {"cat6": 0.15, "cat11": 0.45, "cat19": 0.75}


def _fetch_live():
    """Real api.imd.gov.in call. Not implemented — needs IMD_API_KEY + docs.

    Raises so callers fall back to mock rather than silently serving stale
    data; fill this in once IMD API access (section 1, item 2) is approved.
    """
    raise NotImplementedError("Set USE_LIVE_IMD=true only after implementing this call")


def _fetch_mock():
    now = datetime.now(timezone.utc).isoformat()
    records = []
    for st in STATIONS:
        cat = random.choices(
            list(LIGHTNING_CATS.keys()), weights=[0.5, 0.3, 0.2]
        )[0]
        severity = random.choice(["nil", "isolated", "scattered", "widespread"])
        hail_flag = cat == "cat19" and random.random() < 0.3
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
