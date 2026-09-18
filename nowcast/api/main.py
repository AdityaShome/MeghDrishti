"""FastAPI service (section 5a).

Serves hazard GeoJSON and storm ETA computed from the latest IMD ingestion
cycle. Inference is cached per file-write, recomputed only when a new
ingestion snapshot lands (not on every request) — matches the "cached, not
per-call" requirement in the plan.
"""
import glob
import json
import os
import sys
import threading
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from nowcast.configs.settings import IMD_DIR, INGEST_CYCLE_MINUTES
from nowcast.ingestion.imd_nowcast import pull as pull_imd
from nowcast.models.hazard import classify_station
from nowcast.models.eta import storm_cells

app = FastAPI(title="MeghDrishti Nowcast API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_cache = {"records": [], "loaded_from": None}
_lock = threading.Lock()


def _latest_snapshot_path():
    files = sorted(glob.glob(os.path.join(IMD_DIR, "*.json")))
    return files[-1] if files else None


def _refresh():
    path = _latest_snapshot_path()
    if path is None:
        return
    if path == _cache["loaded_from"]:
        return
    with open(path) as f:
        data = json.load(f)
    with _lock:
        _cache["records"] = [classify_station(r) for r in data["records"]]
        _cache["loaded_from"] = path


def _background_ingest_loop():
    while True:
        pull_imd()
        _refresh()
        time.sleep(INGEST_CYCLE_MINUTES * 60)


@app.on_event("startup")
def startup():
    if _latest_snapshot_path() is None:
        pull_imd()
    _refresh()
    t = threading.Thread(target=_background_ingest_loop, daemon=True)
    t.start()


@app.get("/hazards")
def hazards(lead_time: int = Query(0, description="minutes, unused in replay mode")):
    _refresh()
    features = []
    for rec in _cache["records"]:
        if not rec["hazards"]:
            continue
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [rec["lon"], rec["lat"]]},
                "properties": {
                    "station_id": rec["station_id"],
                    "name": rec.get("name"),
                    "hazards": rec["hazards"],
                    "ts_severity": rec.get("ts_severity"),
                    "lightning_prob_cat": rec.get("lightning_prob_cat"),
                    "timestamp": rec.get("timestamp"),
                },
            }
        )
    return {"type": "FeatureCollection", "features": features, "lead_time_minutes": lead_time}


@app.get("/storm-eta")
def storm_eta():
    _refresh()
    return {"cells": storm_cells(_cache["records"])}


@app.get("/raw-layers")
def raw_layers():
    # Placeholder until satellite/radar ingestion (2b/2c) is wired in.
    return {"layers": [], "note": "satellite/radar overlays not yet ingested"}


@app.get("/health")
def health():
    return {"status": "ok", "loaded_from": _cache["loaded_from"]}
