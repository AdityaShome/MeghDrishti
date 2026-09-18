# MeghDrishti

Convective-scale nowcasting system (SIH 2026) — 0-6h thunderstorm/hail/downburst/cloudburst
nowcasting fusing IMD radar, INSAT satellite, and lightning data on a GIS dashboard.
Full plan: [`project.md`](project.md).

## Current status (Checkpoint 4, replay mode — all data is mock/synthetic)

- IMD nowcast puller (`nowcast/ingestion/imd_nowcast.py`) — runs in **mock/replay mode**
  (no MOSDAC/IMD credentials configured yet). Generates plausible station data with the
  exact schema the real API will return, so swapping in live data later is a config
  change (`USE_LIVE_IMD=true` in `.env`), not a rewrite.
- Synthetic reflectivity frames (`nowcast/processing/synthetic_radar.py`) — stand-in for
  real radar until MOSDAC access exists.
- pySTEPS optical-flow + extrapolation baseline (`nowcast/models/pysteps_baseline.py`,
  section 4a) — real Lucas-Kanade motion estimation + semi-Lagrangian extrapolation,
  0-6h at 10-min steps, running on the synthetic frames above.
- Rule-based hazard classification — hail, lightning (`nowcast/models/hazard.py`) and
  cloudburst from pySTEPS rain-rate extrapolation (`nowcast/models/pysteps_baseline.py:cloudburst_cells`).
  Downburst still blocked on real radar radial-velocity data.
- ETA model (`nowcast/models/eta.py`) — motion (bearing/speed) now derived from the
  pySTEPS optical-flow field, not a placeholder; falls back to placeholder only if the
  flow is degenerate.
- FastAPI backend — `/hazards` (lead_time-aware, includes cloudburst), `/storm-eta`,
  `/forecast` (6h rain-rate summary), `/raw-layers` — `nowcast/api/main.py`.
- MapLibre dashboard — hazard layer, live countdown clocks, 0-6h lead-time slider —
  `nowcast/dashboard/index.html`.

Not yet built: real satellite ingestion (2b), real radar ingestion (2c), fusion grid (3),
deep model (4b). See `project.md` for the full phased plan and fallback matrix.

**Everything above runs on synthetic/mock data.** No real IMD, MOSDAC, or radar data is
in the pipeline yet — that requires the account registration in section 1, which needs to
be done by a human (see Next steps).

## Run it

```bash
pip install -r requirements.txt
uvicorn nowcast.api.main:app --reload --port 8000
```

Then open `nowcast/dashboard/index.html` directly in a browser (it calls `http://localhost:8000`).

## Next steps (in plan order)

1. Register MOSDAC + request IMD API access (project.md section 1) — do this first, it's the
   longest lead time item, and nothing above becomes "real" without it.
2. Implement `_fetch_live` in `imd_nowcast.py` once IMD API access is granted.
3. Build satellite (2b) and radar (2c) pullers — real radar CAPPI grids replace
   `synthetic_radar.py` as pySTEPS' input (same array shape/units, drop-in swap).
4. Build the fusion grid (section 3) to combine satellite + radar + lightning into one
   multi-channel raster; wire in downburst hazard once real radar velocity exists.
