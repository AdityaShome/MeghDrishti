"""Central config: demo region, thresholds, paths.

Demo region default: Pune district, Maharashtra (good IMD AWS density,
inside MOSDAC radar footprint). Change BBOX to retarget the whole pipeline.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Selectable demo regions — the storm-scale grid (radar/satellite/pySTEPS/
# DGMR/hazards) is deliberately a small, fixed-size box (~0.5deg, matches
# GRID_SIZE=64 in synthetic_radar.py for ~800m/cell resolution): widening
# this box itself to cover all of India would collapse the demo storm to
# a sub-pixel blob and blow up hazard-rule filter windows tuned for this
# scale. Instead, the SAME size box can be repositioned to any major city,
# so real layers (RainViewer/Blitzortung/ECMWF, which already cover all of
# India) and the synthetic storm-scale grid both center on wherever the
# user picks.
REGIONS = {
    "pune": {"name": "Pune", "bbox": (73.6, 18.3, 74.1, 18.8)},
    "delhi": {"name": "Delhi NCR", "bbox": (76.85, 28.35, 77.35, 28.85)},
    "mumbai": {"name": "Mumbai", "bbox": (72.6, 18.85, 73.1, 19.35)},
    "chennai": {"name": "Chennai", "bbox": (80.0, 12.85, 80.5, 13.35)},
    "kolkata": {"name": "Kolkata", "bbox": (88.15, 22.35, 88.65, 22.85)},
    "bengaluru": {"name": "Bengaluru", "bbox": (77.35, 12.75, 77.85, 13.25)},
    "hyderabad": {"name": "Hyderabad", "bbox": (78.25, 17.15, 78.75, 17.65)},
    "ahmedabad": {"name": "Ahmedabad", "bbox": (72.35, 22.80, 72.85, 23.30)},
    "jaipur": {"name": "Jaipur", "bbox": (75.55, 26.65, 76.05, 27.15)},
    "guwahati": {"name": "Guwahati", "bbox": (91.5, 26.0, 92.0, 26.5)},
}

_active_region_key = "pune"


def get_active_region_key():
    return _active_region_key


def set_active_region(key):
    """Switch the active demo region. Takes effect on the next ingest cycle —
    every consumer calls get_region_bbox()/get_region_name() fresh rather than
    importing a frozen constant, see settings.py's own module docstring note."""
    global _active_region_key
    if key not in REGIONS:
        raise ValueError(f"unknown region '{key}', choose from {list(REGIONS)}")
    _active_region_key = key


def get_region_bbox():
    return REGIONS[_active_region_key]["bbox"]


def get_region_name():
    return REGIONS[_active_region_key]["name"]


# Legacy static constants — frozen at import time, do NOT reflect region
# switches made after import. Kept only so nothing crashes if something still
# imports these directly; every ingestion/processing/model module in this
# project has been converted to call get_region_bbox()/get_region_name()
# instead. New code should always use the getters.
REGION_BBOX = REGIONS[_active_region_key]["bbox"]
REGION_NAME = REGIONS[_active_region_key]["name"]

# Wider synthetic weather-variable grid (temperature/humidity/wind) — covers
# Maharashtra-ish extent so the map shows colored data across the visible
# area, not just the tiny storm bbox. Coarser resolution since it's a smooth
# ambient field, not something pySTEPS/DGMR need to consume.
WIDE_BBOX = (72.5, 15.5, 78.5, 21.5)
WIDE_GRID_SIZE = 48

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
IMD_DIR = os.path.join(DATA_DIR, "imd")

# Set True once real IMD API key / MOSDAC creds are configured via .env.
# False = replay/mock mode (see fallback matrix, section 6 of project.md).
USE_LIVE_IMD = os.getenv("USE_LIVE_IMD", "false").lower() == "true"
IMD_API_KEY = os.getenv("IMD_API_KEY", "")
TOMORROW_API_KEY = os.getenv("TOMORROW_API_KEY", "")

# ECMWF Open Data (temperature/humidity/wind grid) — genuinely free, no API
# key needed (their older key-based public-datasets service was mostly
# decommissioned in 2023; see nowcast/ingestion/ecmwf_weather.py). Still
# opt-in like the other USE_LIVE_* flags: it makes real network calls on
# every distinct forecast step requested, so it's not on by default.
USE_LIVE_ECMWF = os.getenv("USE_LIVE_ECMWF", "false").lower() == "true"

# RainViewer radar reflectivity — real, quantitative dBZ, no API key needed.
# India coverage is IMD's public radar network, republished by RainViewer.
# Radial (Doppler) velocity has no public equivalent and stays synthetic
# even with this on — see nowcast/ingestion/rainviewer_radar.py.
USE_LIVE_RADAR = os.getenv("USE_LIVE_RADAR", "false").lower() == "true"

# Blitzortung.org real lightning strikes — free community VLF network, no
# API key needed, fills the gap neither the IMD feed nor Tomorrow.io cover
# (Tomorrow.io's realtime endpoint has no lightning field at all). Independent
# of USE_LIVE_IMD: applies on top of whichever station-data source is active.
# See nowcast/ingestion/blitzortung_lightning.py.
USE_LIVE_LIGHTNING = os.getenv("USE_LIVE_LIGHTNING", "false").lower() == "true"

# Hazard thresholds (section 4c of project.md) — documented here, not buried.
HAIL_LIGHTNING_CAT_MIN = "cat17"       # IMD hail flag category
CLOUDBURST_RAIN_RATE_MM_HR = 15.0      # IMD "very heavy rain" threshold
LIGHTNING_PROB_HIGH = 0.60             # Cat19 boundary

# Grid-based hail rule (4c): reflectivity core AND cold cloud top AND
# elevated lightning, all collocated on the fusion grid.
HAIL_REFLECTIVITY_MIN_DBZ = 55.0
HAIL_COLD_TOP_MAX_K = 210.0            # TIR-1 brightness temp, overshoot-top territory
HAIL_LIGHTNING_PROB_MIN = 0.30

# Downburst (4c): radial-velocity couplet magnitude — inbound/outbound
# delta across the storm core. Only computable with real radar velocity,
# never from a PNG overlay fallback.
DOWNBURST_VELOCITY_DELTA_MS = 25.0

INGEST_CYCLE_MINUTES = 15
