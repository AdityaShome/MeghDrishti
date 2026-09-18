"""Central config: demo region, thresholds, paths.

Demo region default: Pune district, Maharashtra (good IMD AWS density,
inside MOSDAC radar footprint). Change BBOX to retarget the whole pipeline.
"""
import os

# lon_min, lat_min, lon_max, lat_max
REGION_BBOX = (73.6, 18.3, 74.1, 18.8)
REGION_NAME = "Pune"

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
IMD_DIR = os.path.join(DATA_DIR, "imd")

# Set True once real IMD API key / MOSDAC creds are configured via .env.
# False = replay/mock mode (see fallback matrix, section 6 of project.md).
USE_LIVE_IMD = os.getenv("USE_LIVE_IMD", "false").lower() == "true"
IMD_API_KEY = os.getenv("IMD_API_KEY", "")

# Hazard thresholds (section 4c of project.md) — documented here, not buried.
HAIL_LIGHTNING_CAT_MIN = "cat17"       # IMD hail flag category
CLOUDBURST_RAIN_RATE_MM_HR = 15.0      # IMD "very heavy rain" threshold
LIGHTNING_PROB_HIGH = 0.60             # Cat19 boundary

INGEST_CYCLE_MINUTES = 15
