"""FastAPI service (section 5a).

Serves hazard GeoJSON and storm ETA computed from the latest ingestion
cycle. Inference is cached per file-write, recomputed only when a new
ingestion snapshot lands (not on every request) — matches the "cached, not
per-call" requirement in the plan.
"""
import base64
import glob
import io
import json
import os
import sys
import threading
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
import requests
from fastapi import FastAPI, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from nowcast.configs.settings import IMD_DIR, INGEST_CYCLE_MINUTES, CLOUDBURST_RAIN_RATE_MM_HR
from nowcast.ingestion.imd_nowcast import pull as pull_imd
from nowcast.ingestion.satellite_insat import pull as pull_satellite
from nowcast.ingestion.radar_puller import pull as pull_radar
from nowcast.models.hazard import classify_station, hail_cells, downburst_cells
from nowcast.models.eta import storm_cells
from nowcast.models.pysteps_baseline import run_forecast, cloudburst_cells
from nowcast.processing.fusion import build_fused_frame
from nowcast.processing import weather_fields

app = FastAPI(title="MeghDrishti Nowcast API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_cache = {"records": [], "loaded_from": None}
_forecast_cache = {"data": None, "computed_at": 0}
_dgmr_cache = {"data": None, "computed_at": 0, "load_failed": False}
_fusion_cache = {"frame": None, "computed_at": 0}
_FORECAST_TTL_SECONDS = INGEST_CYCLE_MINUTES * 60
_lock = threading.Lock()


def _refresh_dgmr():
    """DGMR (section 4b) is loaded and run lazily, on first request only —
    it's a comparison/demo feature, not on the critical startup path, and
    weight download + CPU inference (~seconds) shouldn't slow down the
    primary pySTEPS-driven demo. Cached for the same TTL as pySTEPS."""
    if _dgmr_cache["load_failed"]:
        return None
    now = time.time()
    if _dgmr_cache["data"] is not None and now - _dgmr_cache["computed_at"] < _FORECAST_TTL_SECONDS:
        return _dgmr_cache["data"]
    try:
        from nowcast.models.dgmr_nowcast import run_forecast as dgmr_run_forecast

        with _lock:
            _dgmr_cache["data"] = dgmr_run_forecast()
            _dgmr_cache["computed_at"] = now
        return _dgmr_cache["data"]
    except Exception as exc:
        print(f"[api] DGMR unavailable, disabling for this process: {exc}")
        _dgmr_cache["load_failed"] = True
        return None


def _refresh_fusion():
    now = time.time()
    if _fusion_cache["frame"] is not None and now - _fusion_cache["computed_at"] < _FORECAST_TTL_SECONDS:
        return _fusion_cache["frame"]
    with _lock:
        _fusion_cache["frame"] = build_fused_frame()
        _fusion_cache["computed_at"] = now
    return _fusion_cache["frame"]


def _refresh_forecast():
    """pySTEPS forecast is expensive-ish (LK + extrapolation) — cache it for
    the same ingestion cycle rather than recomputing per request."""
    now = time.time()
    if _forecast_cache["data"] is not None and now - _forecast_cache["computed_at"] < _FORECAST_TTL_SECONDS:
        return _forecast_cache["data"]
    with _lock:
        _forecast_cache["data"] = run_forecast()
        _forecast_cache["computed_at"] = now
    return _forecast_cache["data"]


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


def _ingest_all():
    """Run all three independent pullers (2a/2b/2c) — one source's failure
    never blocks the others, matching the ingestion layer's failure-isolation
    requirement (section 2)."""
    for name, fn in (("imd", pull_imd), ("satellite", pull_satellite), ("radar", pull_radar)):
        try:
            fn()
        except Exception as exc:
            print(f"[api] {name} puller failed: {exc}")


def _background_ingest_loop():
    while True:
        _ingest_all()
        _refresh()
        _fusion_cache["frame"] = build_fused_frame()
        _fusion_cache["computed_at"] = time.time()
        time.sleep(INGEST_CYCLE_MINUTES * 60)


@app.on_event("startup")
def startup():
    if _latest_snapshot_path() is None:
        _ingest_all()
    _refresh()
    _refresh_fusion()
    t = threading.Thread(target=_background_ingest_loop, daemon=True)
    t.start()


@app.get("/hazards")
def hazards(lead_time: int = Query(0, description="minutes; snaps to nearest pySTEPS lead step")):
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

    # cloudburst hazard (4c): rule-based on pySTEPS extrapolated rain rate,
    # snapped to the lead step nearest the requested lead_time.
    try:
        fc = _refresh_forecast()
        steps = fc["timestamps_min"]
        nearest_idx = min(range(len(steps)), key=lambda i: abs(steps[i] - lead_time)) if lead_time > 0 else None
        hits = cloudburst_cells(fc, threshold_mm_hr=CLOUDBURST_RAIN_RATE_MM_HR)
        if nearest_idx is not None:
            target_lead = steps[nearest_idx]
            hits = [h for h in hits if h["lead_minutes"] == target_lead]
        else:
            hits = [h for h in hits if h["lead_minutes"] == steps[0]]
        for h in hits:
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [h["lon"], h["lat"]]},
                "properties": {
                    "hazards": [{"type": "cloudburst", "severity": "high", "rainrate_mm_hr": h["rainrate_mm_hr"]}],
                    "lead_minutes": h["lead_minutes"],
                },
            })
    except Exception as exc:
        print(f"[api] cloudburst forecast unavailable: {exc}")

    # hail + downburst (4c): grid-based rules on the fused raster, current
    # timestep only — these don't have a pySTEPS-extrapolated future state.
    if lead_time == 0:
        try:
            frame = _refresh_fusion()
            if frame is not None:
                for h in hail_cells(frame):
                    features.append({
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [h["lon"], h["lat"]]},
                        "properties": {
                            "hazards": [{"type": "hail", "severity": "high",
                                         "reflectivity_dbz": h["reflectivity_dbz"]}],
                        },
                    })
                for d in downburst_cells(frame):
                    features.append({
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [d["lon"], d["lat"]]},
                        "properties": {
                            "hazards": [{"type": "downburst", "severity": "high",
                                         "velocity_delta_ms": d["velocity_delta_ms"]}],
                        },
                    })
        except Exception as exc:
            print(f"[api] grid hazards unavailable: {exc}")

    return {"type": "FeatureCollection", "features": features, "lead_time_minutes": lead_time}


@app.get("/forecast")
def forecast(model: str = Query("pysteps", pattern="^(pysteps|dgmr)$")):
    """Forecast summary for the dashboard time slider / baseline-vs-AI
    comparison (section 4b). `model=pysteps` (default, 0-6h, calibrated
    mm/hr) or `model=dgmr` (0-90min, relative intensity 0-1 — see
    dgmr_nowcast module docstring for why it's not in mm/hr)."""
    if model == "dgmr":
        fc = _refresh_dgmr()
        if fc is None:
            return {"available": False, "reason": "DGMR failed to load in this process (see server log)"}
        return {
            "available": True,
            "timestamps_min": fc["timestamps_min"],
            "max_intensity": [round(float(f.max()), 2) for f in fc["intensity_forecast"]],
            "mean_intensity": [round(float(f.mean()), 3) for f in fc["intensity_forecast"]],
            "bbox": fc["bbox"],
            "source": "dgmr-synthetic-input",
            "note": fc["note"],
        }
    fc = _refresh_forecast()
    return {
        "available": True,
        "timestamps_min": fc["timestamps_min"],
        "max_rainrate_mm_hr": [round(float(f.max()), 1) for f in fc["rainrate_forecast"]],
        "mean_rainrate_mm_hr": [round(float(f.mean()), 2) for f in fc["rainrate_forecast"]],
        "bbox": fc["bbox"],
        "source": "pysteps-synthetic",
    }


@app.get("/storm-eta")
def storm_eta():
    _refresh()
    return {"cells": storm_cells(_cache["records"])}


def _array_to_png_data_url(arr, cmap_name, vmin=None, vmax=None):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.cm as cm
    import matplotlib.colors as mcolors
    import numpy as np
    from PIL import Image

    norm = mcolors.Normalize(vmin=vmin if vmin is not None else float(arr.min()),
                              vmax=vmax if vmax is not None else float(arr.max()))
    rgba = (cm.get_cmap(cmap_name)(norm(arr)) * 255).astype(np.uint8)
    # flip vertically: array row 0 is the southern edge of the grid, PNG row 0 is the top
    img = Image.fromarray(np.flipud(rgba), mode="RGBA")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


@app.get("/nowcast-frame")
def nowcast_frame(
    model: str = Query("pysteps", pattern="^(pysteps|dgmr)$"),
    lead_time: int = Query(10, description="minutes; snaps to nearest available lead step"),
):
    """Single forecast frame as a PNG overlay (section 4b's baseline-vs-AI
    comparison toggle) — pySTEPS rain rate (calibrated mm/hr, turbo
    colormap) or DGMR relative intensity (unitless 0-1, plasma colormap,
    distinct palette so it's visually obvious this is not the same unit)."""
    if model == "dgmr":
        fc = _refresh_dgmr()
        if fc is None:
            return {"available": False, "reason": "DGMR failed to load in this process (see server log)"}
        idx = min(range(len(fc["timestamps_min"])), key=lambda i: abs(fc["timestamps_min"][i] - lead_time))
        frame = fc["intensity_forecast"][idx]
        image = _array_to_png_data_url(frame, "plasma", vmin=0, vmax=1)
        return {"available": True, "image": image, "bbox": fc["bbox"],
                "lead_minutes": fc["timestamps_min"][idx], "source": "dgmr", "note": fc["note"]}

    fc = _refresh_forecast()
    idx = min(range(len(fc["timestamps_min"])), key=lambda i: abs(fc["timestamps_min"][i] - lead_time))
    frame = fc["rainrate_forecast"][idx]
    image = _array_to_png_data_url(frame, "turbo", vmin=0, vmax=65)
    return {"available": True, "image": image, "bbox": fc["bbox"],
            "lead_minutes": fc["timestamps_min"][idx], "source": "pysteps"}


@app.get("/raw-layers")
def raw_layers():
    """Satellite IR + radar reflectivity as image overlays (section 5a).

    Rendered from the synthetic fusion grid until MOSDAC/IMD radar access
    exists (2b/2c) — same bbox-anchored PNG-overlay contract the real
    pipeline will use (real satellite reprojected via pyresample, real
    radar as a Py-ART CAPPI), so the dashboard doesn't change when the
    source is swapped.
    """
    frame = _refresh_fusion()
    if frame is None:
        return {"layers": [], "note": "no fused frame yet — ingestion still warming up"}

    ch = frame["channels"]
    layers = [
        {
            "id": "satellite_tir1",
            "label": "Satellite IR (TIR-1, 10.8um)",
            "bbox": frame["bbox"],
            "image": _array_to_png_data_url(ch["tir1"], "gray_r", vmin=190, vmax=300),
            "source": "synthetic",
        },
        {
            "id": "radar_reflectivity",
            "label": "Radar reflectivity (dBZ)",
            "bbox": frame["bbox"],
            "image": _array_to_png_data_url(ch["reflectivity_dbz"], "turbo", vmin=0, vmax=65),
            "source": "synthetic",
        },
    ]
    return {"layers": layers, "note": "synthetic sensors — no MOSDAC/IMD radar or satellite access yet"}


@app.get("/weather-layers")
def weather_layers():
    """Temperature/humidity/wind-speed as colored map overlays across the
    wide demo region (§WIDE_BBOX) — not just the narrow storm bbox used for
    radar/satellite/hazards. Synthetic (see processing/weather_fields.py),
    but spatially coherent with the storm's position."""
    g = weather_fields.generate_grid()
    layers = [
        {
            "id": "temperature",
            "label": "Temperature",
            "unit": "°C",
            "bbox": g["bbox"],
            "vmin": 18, "vmax": 34,
            "image": _array_to_png_data_url(g["temperature_c"], "RdYlBu_r", vmin=18, vmax=34),
        },
        {
            "id": "humidity",
            "label": "Relative humidity",
            "unit": "%",
            "bbox": g["bbox"],
            "vmin": 0, "vmax": 100,
            "image": _array_to_png_data_url(g["humidity_pct"], "YlGnBu", vmin=0, vmax=100),
        },
        {
            "id": "wind_speed",
            "label": "Wind speed",
            "unit": "m/s",
            "bbox": g["bbox"],
            "vmin": 0, "vmax": 18,
            "image": _array_to_png_data_url(g["wind_speed_ms"], "plasma", vmin=0, vmax=18),
        },
    ]
    return {"layers": layers, "note": "synthetic ambient fields — not an IMD/MOSDAC product"}


@app.get("/wind-vectors")
def wind_vectors():
    """Sparse wind arrow points (speed + direction) for symbol rendering."""
    return {"points": weather_fields.wind_vector_points()}


@app.get("/region-forecast")
def region_forecast(lat: float, lon: float, lead_time: int = Query(0, ge=0, le=360)):
    """Point-sampled future trend for a user-selected region (temperature/
    humidity/wind at a chosen lead time) — backs the dashboard's per-region
    time-scale panel. Entirely synthetic (see weather_fields.py); if the
    point falls inside the storm bbox, also includes the pySTEPS cloudburst
    rain-rate forecast at the nearest lead step for that location."""
    sample = weather_fields.sample_point(lat, lon, lead_time)

    cloudburst_rainrate = None
    fc = _refresh_forecast()
    lon_min, lat_min, lon_max, lat_max = fc["bbox"]
    if lon_min <= lon <= lon_max and lat_min <= lat <= lat_max:
        n = fc["grid_size"]
        xi = int(round((lon - lon_min) / (lon_max - lon_min) * (n - 1)))
        yi = int(round((lat - lat_min) / (lat_max - lat_min) * (n - 1)))
        idx = min(range(len(fc["timestamps_min"])), key=lambda i: abs(fc["timestamps_min"][i] - lead_time))
        cloudburst_rainrate = round(float(fc["rainrate_forecast"][idx][yi, xi]), 1)

    return {**sample, "lead_minutes": lead_time, "cloudburst_rainrate_mm_hr": cloudburst_rainrate}


_BHUVAN_WMS = "https://bhuvan-vec1.nrsc.gov.in/bhuvan/gwc/service/wms/"


@app.get("/wms-proxy/bhuvan")
def wms_proxy_bhuvan(request: Request):
    """Thin passthrough proxy for Bhuvan's WMS ("Bhuvan Maps" base layer).

    Bhuvan's server doesn't send CORS headers, so a browser can't fetch its
    tiles directly (confirmed via direct testing — curl gets 200, browser
    fetch gets blocked by CORS). The target host is hardcoded, not taken
    from the request, so this can't be used as an open SSRF proxy — it only
    ever forwards to Bhuvan's WMS with whatever WMS query params the caller
    sent (layers/bbox/etc.), which is exactly what a legitimate map tile
    request looks like.
    """
    try:
        upstream = requests.get(_BHUVAN_WMS, params=dict(request.query_params), timeout=10)
    except requests.RequestException as exc:
        return Response(content=str(exc), status_code=502, media_type="text/plain")
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        media_type=upstream.headers.get("Content-Type", "image/png"),
    )


@app.get("/health")
def health():
    return {"status": "ok", "loaded_from": _cache["loaded_from"]}
