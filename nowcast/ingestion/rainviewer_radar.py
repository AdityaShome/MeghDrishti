"""Real radar reflectivity via RainViewer (stand-in for MOSDAC volumetric DWR).

Free, unauthenticated, no API key: `https://api.rainviewer.com/public/weather-maps.json`
lists recent radar frames as slippy-map tile paths; India's coverage there is itself
built from IMD's public radar network, republished by RainViewer rather than pulled
straight from MOSDAC. We fetch the "Black and White" color scheme (scheme id 0), which
RainViewer defines as a direct linear encoding of dBZ into greyscale — not a rendered
color ramp — so this is genuine quantitative reflectivity, not a PNG-inversion guess:
  grey 1..127   -> dBZ = grey - 32   (rain)
  grey 129..255 -> dBZ = grey - 160  (snow)
  alpha 0       -> no data

RainViewer has no Doppler radial-velocity product (that needs a raw volumetric scan,
which no public aggregator exposes) — `velocity_ms` therefore stays synthetic even in
live mode, so the downburst hazard rule (needs a real velocity couplet) never becomes
"real" this way. Document this clearly wherever radar_puller output feeds into hazard
rules.
"""
import os
import sys

import numpy as np
import requests
from PIL import Image
from io import BytesIO

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from nowcast.configs.settings import get_region_bbox

TILE_SIZE = 256
ZOOM = 10  # ~0.35 deg/tile at the equator, well under REGION_BBOX's ~0.5 deg extent


def _latlon_to_tile(lat, lon, zoom):
    lat_rad = np.radians(lat)
    n = 2.0**zoom
    x = (lon + 180.0) / 360.0 * n
    y = (1.0 - np.log(np.tan(lat_rad) + 1.0 / np.cos(lat_rad)) / np.pi) / 2.0 * n
    return x, y


def _tile_bounds(x_tile, y_tile, zoom):
    """Lon/lat bounds of tile (x_tile, y_tile) at `zoom` (top-left, bottom-right)."""
    n = 2.0**zoom
    lon_left = x_tile / n * 360.0 - 180.0
    lon_right = (x_tile + 1) / n * 360.0 - 180.0
    lat_top = np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * y_tile / n))))
    lat_bottom = np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * (y_tile + 1) / n))))
    return lon_left, lat_bottom, lon_right, lat_top


def _decode_dbz(png_bytes):
    img = Image.open(BytesIO(png_bytes)).convert("RGBA")
    arr = np.array(img)
    grey = arr[:, :, 0].astype(np.float32)
    alpha = arr[:, :, 3]

    dbz = np.where(grey <= 127, grey - 32, grey - 160)
    dbz = np.where(alpha == 0, 0.0, dbz)  # no-data -> 0 dBZ, matches synthetic baseline's floor
    return np.clip(dbz, 0, None)


def _latest_frame_path():
    resp = requests.get("https://api.rainviewer.com/public/weather-maps.json", timeout=10)
    resp.raise_for_status()
    data = resp.json()
    host = data["host"]
    past_frames = data["radar"]["past"]
    if not past_frames:
        raise RuntimeError("RainViewer returned no past radar frames")
    return host, past_frames[-1]["path"]  # most recent


def fetch_reflectivity(grid_size=64):
    """Real reflectivity grid over the active region's bbox, regridded to (grid_size, grid_size)."""
    host, frame_path = _latest_frame_path()

    lon_min, lat_min, lon_max, lat_max = get_region_bbox()
    x_min, y_max = _latlon_to_tile(lat_min, lon_min, ZOOM)  # smaller lat -> larger y
    x_max, y_min = _latlon_to_tile(lat_max, lon_max, ZOOM)
    tx_range = range(int(np.floor(x_min)), int(np.floor(x_max)) + 1)
    ty_range = range(int(np.floor(y_min)), int(np.floor(y_max)) + 1)

    tiles = {}
    for ty in ty_range:
        for tx in tx_range:
            url = f"{host}{frame_path}/{TILE_SIZE}/{ZOOM}/{tx}/{ty}/0/0_0.png"
            r = requests.get(url, timeout=10)
            r.raise_for_status()
            tiles[(tx, ty)] = _decode_dbz(r.content)

    tx0, ty0 = min(tx_range), min(ty_range)
    mosaic = np.zeros((len(ty_range) * TILE_SIZE, len(tx_range) * TILE_SIZE), dtype=np.float32)
    for (tx, ty), dbz in tiles.items():
        row0 = (ty - ty0) * TILE_SIZE
        col0 = (tx - tx0) * TILE_SIZE
        mosaic[row0 : row0 + TILE_SIZE, col0 : col0 + TILE_SIZE] = dbz

    mosaic_lon_min, mosaic_lat_min, _, _ = _tile_bounds(tx0, ty0, ZOOM)
    _, _, mosaic_lon_max, mosaic_lat_max = _tile_bounds(max(tx_range), max(ty_range), ZOOM)

    src_lons = np.linspace(mosaic_lon_min, mosaic_lon_max, mosaic.shape[1])
    src_lats = np.linspace(mosaic_lat_max, mosaic_lat_min, mosaic.shape[0])  # row 0 = top = max lat

    from scipy.interpolate import RegularGridInterpolator

    lat_order = np.argsort(src_lats)
    interp = RegularGridInterpolator(
        (src_lats[lat_order], src_lons), mosaic[lat_order, :], bounds_error=False, fill_value=0.0
    )

    dst_lons = np.linspace(lon_min, lon_max, grid_size)
    dst_lats = np.linspace(lat_min, lat_max, grid_size)
    dst_lon_grid, dst_lat_grid = np.meshgrid(dst_lons, dst_lats)
    pts = np.stack([dst_lat_grid.ravel(), dst_lon_grid.ravel()], axis=-1)
    return interp(pts).reshape(dst_lat_grid.shape).astype(np.float32)


if __name__ == "__main__":
    grid = fetch_reflectivity()
    print(f"reflectivity_dbz: min={grid.min():.1f} max={grid.max():.1f} mean={grid.mean():.1f}")
