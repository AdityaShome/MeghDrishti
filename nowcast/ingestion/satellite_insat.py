"""INSAT-3D/3DR satellite puller (section 2b of project.md).

Real path: mdapi.py client against MOSDAC, datasetId 3DIMG_L1B_STD or
3DIMG_L1C_ASIA_MER, parsed with h5py/satpy, reprojected with pyresample.
Not implemented — needs MOSDAC approval (section 1). `_fetch_live` is the
swap-in point once that lands; fallback per the plan's fallback matrix is
GOES-16/Himawari-8 IR/WV via Google Earth Engine, same interface.

USE_LIVE_SATELLITE=false (default): generates synthetic TIR-1 (10.8um),
WV (6.7um), and MWIR fields correlated with the same storm cell as the
synthetic radar (via storm_track), so a real convective signature is
visible — cold cloud top and moist WV signal collocated with the
reflectivity core, not independent noise. Writes to data/satellite/<ts>.npz
with keys: tir1, wv, mwir (each GRID_SIZE x GRID_SIZE), bbox, timestamp.
"""
import os
import sys
from datetime import datetime, timezone

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from nowcast.configs.settings import REGION_BBOX, DATA_DIR
from nowcast.processing.storm_track import center_at
from nowcast.processing.synthetic_radar import GRID_SIZE

SATELLITE_DIR = os.path.join(DATA_DIR, "satellite")

USE_LIVE_SATELLITE = os.getenv("USE_LIVE_SATELLITE", "false").lower() == "true"

# Ambient (clear-sky) brightness temps and convective cold-top minimum, Kelvin.
_TIR1_AMBIENT_K = 298.0
_TIR1_COLD_TOP_K = 198.0  # deep convection overshoot territory
_WV_AMBIENT_K = 245.0
_WV_MOIST_K = 220.0
_MWIR_AMBIENT_K = 285.0


def _grid_coords():
    lon_min, lat_min, lon_max, lat_max = REGION_BBOX
    lons = np.linspace(lon_min, lon_max, GRID_SIZE)
    lats = np.linspace(lat_min, lat_max, GRID_SIZE)
    return np.meshgrid(lons, lats)


def _fetch_live():
    raise NotImplementedError("Set USE_LIVE_SATELLITE=true only after implementing mdapi.py ingestion")


def _fetch_mock(t_min=0):
    lon_grid, lat_grid = _grid_coords()
    km_per_deg_lat = 111.0
    km_per_deg_lon = 111.0 * np.cos(np.radians((REGION_BBOX[1] + REGION_BBOX[3]) / 2))

    c_lat, c_lon = center_at(t_min)
    dy_km = (lat_grid - c_lat) * km_per_deg_lat
    dx_km = (lon_grid - c_lon) * km_per_deg_lon
    r_km = np.sqrt(dx_km**2 + dy_km**2)

    # Cold cloud top footprint is broader than the reflectivity core —
    # anvil/cirrus shield extends beyond the precip core in real convection.
    cloud_sigma_km = 14
    cold_frac = np.exp(-(r_km**2) / (2 * cloud_sigma_km**2))

    tir1 = _TIR1_AMBIENT_K - cold_frac * (_TIR1_AMBIENT_K - _TIR1_COLD_TOP_K)
    wv = _WV_AMBIENT_K - cold_frac * (_WV_AMBIENT_K - _WV_MOIST_K)
    mwir = _MWIR_AMBIENT_K - cold_frac * (_MWIR_AMBIENT_K - _TIR1_COLD_TOP_K - 10)

    noise = lambda k: np.random.normal(0, k, tir1.shape)
    tir1 = (tir1 + noise(1.0)).astype(np.float32)
    wv = (wv + noise(1.0)).astype(np.float32)
    mwir = (mwir + noise(1.0)).astype(np.float32)
    return tir1, wv, mwir


def pull():
    os.makedirs(SATELLITE_DIR, exist_ok=True)
    try:
        tir1, wv, mwir = _fetch_live() if USE_LIVE_SATELLITE else _fetch_mock()
    except Exception as exc:
        print(f"[satellite_insat] live fetch failed ({exc}), falling back to mock", file=sys.stderr)
        tir1, wv, mwir = _fetch_mock()

    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_path = os.path.join(SATELLITE_DIR, f"{ts}.npz")
    np.savez(out_path, tir1=tir1, wv=wv, mwir=mwir, bbox=np.array(REGION_BBOX))
    print(f"[satellite_insat] wrote TIR1/WV/MWIR grid -> {out_path}")
    return out_path


if __name__ == "__main__":
    pull()
