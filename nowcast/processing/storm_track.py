"""Canonical synthetic storm-cell trajectory.

Single source of truth for the fake storm's position over time, so the
synthetic radar (2c), synthetic satellite (2b), and lightning intensity
(2a/2d) all agree on where the storm is at a given timestamp instead of
each mock generator drawing an independent, physically inconsistent cell.
Real ingestion doesn't need this module — it exists only because we're
faking multiple sensors of the *same* storm.
"""
import numpy as np

DEFAULT_CELL = dict(
    cell_lat=18.30,
    cell_lon=73.65,
    bearing_deg=60,   # ENE track, typical monsoon convection over this region
    speed_kmh=30,
)


def center_at(t_min, cell_lat=None, cell_lon=None, bearing_deg=None, speed_kmh=None):
    cell_lat = DEFAULT_CELL["cell_lat"] if cell_lat is None else cell_lat
    cell_lon = DEFAULT_CELL["cell_lon"] if cell_lon is None else cell_lon
    bearing_deg = DEFAULT_CELL["bearing_deg"] if bearing_deg is None else bearing_deg
    speed_kmh = DEFAULT_CELL["speed_kmh"] if speed_kmh is None else speed_kmh

    km_per_deg_lat = 111.0
    km_per_deg_lon = 111.0 * np.cos(np.radians(cell_lat))
    bearing_rad = np.radians(bearing_deg)

    dist_km = speed_kmh * (t_min / 60.0)
    dlat = (dist_km * np.cos(bearing_rad)) / km_per_deg_lat
    dlon = (dist_km * np.sin(bearing_rad)) / km_per_deg_lon
    return cell_lat + dlat, cell_lon + dlon
