# MeghDrishti

Convective-scale nowcasting system (SIH 2026) — 0-6h thunderstorm/hail/downburst/cloudburst
nowcasting fusing IMD radar, INSAT satellite, and lightning data on a GIS dashboard.
Full plan: [`project.md`](project.md).

## Current status (Checkpoint 2, replay mode)

- IMD nowcast puller (`nowcast/ingestion/imd_nowcast.py`) — runs in **mock/replay mode**
  (no MOSDAC/IMD credentials configured yet). Generates plausible station data with the
  exact schema the real API will return, so swapping in live data later is a config
  change (`USE_LIVE_IMD=true` in `.env`), not a rewrite.
- Rule-based hazard classification (hail, lightning) — `nowcast/models/hazard.py`.
- Placeholder ETA/motion model — `nowcast/models/eta.py` (swap for pySTEPS output, section 4a).
- FastAPI backend serving `/hazards`, `/storm-eta`, `/raw-layers` — `nowcast/api/main.py`.
- MapLibre dashboard with hazard layer + live countdown clocks — `nowcast/dashboard/index.html`.

Not yet built: satellite ingestion (2b), radar ingestion (2c), fusion grid (3), pySTEPS (4a),
deep model (4b). See `project.md` for the full phased plan and fallback matrix.

## Run it

```bash
pip install -r requirements.txt
uvicorn nowcast.api.main:app --reload --port 8000
```

Then open `nowcast/dashboard/index.html` directly in a browser (it calls `http://localhost:8000`).

## Next steps (in plan order)

1. Register MOSDAC + request IMD API access (project.md section 1) — do this first, it's the
   longest lead time item.
2. Implement `_fetch_live` in `imd_nowcast.py` once IMD API access is granted.
3. Build satellite (2b) and radar (2c) pullers.
4. Build the fusion grid (section 3) and pySTEPS baseline (4a) — replaces the placeholder ETA.
