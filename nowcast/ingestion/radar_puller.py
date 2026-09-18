"""Radar puller (section 2c of project.md).

Real path: MOSDAC volumetric DWR datasets (TERLS/SHAR) parsed with `pyiwr`
-> Py-ART -> CAPPI grid, for regions with MOSDAC radar coverage. Where
there's no coverage, the plan's fallback is the public PNG radar overlay
(mausam.imd.gov.in) as a visual-only layer — NOT inverted to quantitative
reflectivity. This mode is not that: it's synthetic, standing in for a
real CAPPI grid until MOSDAC radar access exists, so pySTEPS (4a) and the
downburst rule (4c, needs radial velocity — not derivable from a PNG) have
something to run on. Document which mode is active in the demo write-up.

Writes CAPPI-like output to data/radar/<ts>.npz with keys: reflectivity_dbz,
velocity_ms, bbox, timestamp.
"""
import os
import sys
from datetime import datetime, timezone

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from nowcast.configs.settings import REGION_BBOX, DATA_DIR
from nowcast.processing.synthetic_radar import generate_sequence, generate_velocity_frame

RADAR_DIR = os.path.join(DATA_DIR, "radar")

USE_LIVE_RADAR = os.getenv("USE_LIVE_RADAR", "false").lower() == "true"


def _fetch_live():
    raise NotImplementedError(
        "Set USE_LIVE_RADAR=true only after implementing pyiwr/Py-ART CAPPI ingestion "
        "for a MOSDAC-covered region"
    )


def _fetch_mock():
    frames, _ = generate_sequence(n_frames=1, dt_minutes=0)
    reflectivity = frames[0]
    velocity = generate_velocity_frame(t_min=0)
    return reflectivity, velocity


def pull():
    os.makedirs(RADAR_DIR, exist_ok=True)
    try:
        reflectivity, velocity = _fetch_live() if USE_LIVE_RADAR else _fetch_mock()
    except Exception as exc:
        print(f"[radar_puller] live fetch failed ({exc}), falling back to mock", file=sys.stderr)
        reflectivity, velocity = _fetch_mock()

    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_path = os.path.join(RADAR_DIR, f"{ts}.npz")
    np.savez(out_path, reflectivity_dbz=reflectivity, velocity_ms=velocity, bbox=np.array(REGION_BBOX))
    print(f"[radar_puller] wrote CAPPI reflectivity+velocity -> {out_path}")
    return out_path


if __name__ == "__main__":
    pull()
