"""Synthetic reflectivity frame generator — stand-in for real radar (2c).

No MOSDAC radar access yet, and PNG radar overlays (the other fallback in
section 2c) aren't quantitative, so pySTEPS (4a) can't run on them. This
generates a moving Gaussian storm cell on the demo grid so pySTEPS'
optical-flow + extrapolation has *something* physically plausible to work
on end to end. Swap for real CAPPI grids from `pyiwr`/Py-ART once MOSDAC
radar access exists — output shape/units (dBZ on a lat/lon grid) match
what the real pipeline will produce.
"""
import numpy as np

from nowcast.configs.settings import REGION_BBOX

GRID_SIZE = 64  # cells per side, ~ few hundred m to 1km depending on bbox extent


def _grid_coords():
    lon_min, lat_min, lon_max, lat_max = REGION_BBOX
    lons = np.linspace(lon_min, lon_max, GRID_SIZE)
    lats = np.linspace(lat_min, lat_max, GRID_SIZE)
    return np.meshgrid(lons, lats)


def generate_sequence(n_frames=6, cell_lat=18.30, cell_lon=73.65, bearing_deg=60,
                       speed_kmh=30, dt_minutes=10, peak_dbz=58, radius_km=8):
    """Return (frames, timestamps_min) — frames: list of (GRID_SIZE, GRID_SIZE) dBZ arrays.

    Storm cell advects along `bearing_deg` at `speed_kmh`, one frame every
    `dt_minutes`, oldest first (as pySTEPS expects).
    """
    lon_grid, lat_grid = _grid_coords()
    km_per_deg_lat = 111.0
    km_per_deg_lon = 111.0 * np.cos(np.radians((REGION_BBOX[1] + REGION_BBOX[3]) / 2))

    bearing_rad = np.radians(bearing_deg)
    frames = []
    for i in range(n_frames):
        t_min = i * dt_minutes
        dist_km = speed_kmh * (t_min / 60.0)
        dlat = (dist_km * np.cos(bearing_rad)) / km_per_deg_lat
        dlon = (dist_km * np.sin(bearing_rad)) / km_per_deg_lon
        c_lat, c_lon = cell_lat + dlat, cell_lon + dlon

        dy_km = (lat_grid - c_lat) * km_per_deg_lat
        dx_km = (lon_grid - c_lon) * km_per_deg_lon
        r_km = np.sqrt(dx_km**2 + dy_km**2)
        frame = peak_dbz * np.exp(-(r_km**2) / (2 * radius_km**2))
        frame += np.random.normal(0, 0.5, frame.shape)  # sensor noise
        frames.append(np.clip(frame, 0, None).astype(np.float32))

    return frames, [i * dt_minutes for i in range(n_frames)]
