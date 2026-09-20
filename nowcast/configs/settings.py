"""Central config: demo region, thresholds, paths.

Demo region default: Pune district, Maharashtra (good IMD AWS density,
inside MOSDAC radar footprint). Change BBOX to retarget the whole pipeline.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# lon_min, lat_min, lon_max, lat_max — fine storm-scale grid (radar/satellite/
# pySTEPS/DGMR/hazards). Kept small on purpose: these all run per-request or
# per-ingest-cycle and the demo storm needs to stay inside it.
REGION_BBOX = (73.6, 18.3, 74.1, 18.8)
REGION_NAME = "Pune"

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
