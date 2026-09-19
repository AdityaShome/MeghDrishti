# MeghDrishti

Convective-scale nowcasting system (SIH 2026) — 0-6h thunderstorm/hail/downburst/cloudburst
nowcasting fusing IMD radar, INSAT satellite, and lightning data on a GIS dashboard.
Full plan: [`project.md`](project.md). One-page write-up: [`WRITEUP.md`](WRITEUP.md).

## Current status — Definition of Done (§8) satisfied

No MOSDAC or IMD *nowcast API* credentials exist yet (see Next steps) — **all hazard/
storm data below is synthetic**, clearly labeled as such in code and in the dashboard
itself. All three mock generators (IMD, satellite, radar) share one canonical fake storm
trajectory (`nowcast/processing/storm_track.py`) so they agree with each other, and every
ingestion module has a `_fetch_live()` stub with the real API's schema ready to fill in.
The map's GIS base/overlay layers, however, **are real** — see below.

- **Ingestion (2a/2b/2c)**: `nowcast/ingestion/{imd_nowcast,satellite_insat,radar_puller}.py`
  — mock IMD nowcast JSON, synthetic INSAT-like TIR1/WV/MWIR, synthetic radar
  reflectivity + radial velocity (for downburst). Each runs independently; one failing
  doesn't block the others (`_ingest_all` in `api/main.py`).
- **Fusion (§3)**: `nowcast/processing/fusion.py` — regrids and stacks
  `[tir1, wv, mwir, reflectivity, lightning_prob]` into one multi-channel raster,
  rolling buffer scaffold included.
- **pySTEPS baseline (4a)**: `nowcast/models/pysteps_baseline.py` — real Lucas-Kanade
  optical flow + semi-Lagrangian extrapolation, 0-6h at 10-min steps, on the synthetic
  reflectivity sequence.
- **Hazard rules (4c)**, all rule-based with documented thresholds in
  `nowcast/configs/settings.py`:
  - Hail: `nowcast/models/hazard.py:hail_cells` — reflectivity + cold cloud top +
    lightning, collocated on the fusion grid.
  - Downburst: `nowcast/models/hazard.py:downburst_cells` — radial-velocity couplet
    magnitude via local max/min filter.
  - Cloudburst: `nowcast/models/pysteps_baseline.py:cloudburst_cells` — pySTEPS
    extrapolated rain rate vs. IMD's very-heavy-rain threshold.
  - Lightning: IMD probability category thresholds.
- **ETA/motion**: `nowcast/models/eta.py` — bearing/speed derived from the same pySTEPS
  Lucas-Kanade field, not a separate model.
- **DGMR deep model (4b, stretch goal)**: `nowcast/models/dgmr_nowcast.py` — DeepMind's
  pretrained Skillful Nowcasting GAN (`openclimatefix/dgmr`), real weights, run zero-shot
  on CPU (~3-11s/forecast). Output is a documented unitless relative-intensity field, not
  calibrated mm/hr (UK-radar domain shift on synthetic input) — see the module docstring
  and `WRITEUP.md` for why, and why it's never fed into the cloudburst hazard rule.
- **API**: `nowcast/api/main.py` — `/hazards` (lead-time aware, all 4 hazard types),
  `/storm-eta`, `/forecast?model=pysteps|dgmr`, `/nowcast-frame?model=...&lead_time=...`
  (single-frame PNG for the model comparison toggle), `/raw-layers` (satellite IR + radar
  reflectivity as real PNG image overlays), `/health`.
- **Real GIS layers** (`nowcast/dashboard/src/lib/mosdacLayers.ts`): 16 overlay layers
  (LULC, basins, drainage, landslide/fire risk, rivers, roads, railways, airports,
  admin/taluka boundaries, district population) and 7 base layers (Bhuvan Maps, OSM, DEM,
  LULC, Natural Earth, Black/True Marble) — genuine ISRO/NRSC/MOSDAC WMS data. Sourced by
  driving MOSDAC's live CloudBurst DSS (`mosdac.gov.in/cloudburst/`) with a real browser
  and capturing each layer's actual WMS request; every layer verified with a direct
  GetMap request returning HTTP 200 + a real image before being wired in. Bhuvan's WMS
  has no CORS headers, so it's routed through `/wms-proxy/bhuvan` on our own backend.
- **Dashboard** (`nowcast/dashboard/`, React + TypeScript + Vite — see its own README):
  real basemap (Esri dark-gray canvas, no API key needed) with the real GIS layers above
  selectable as alternate base maps or toggleable overlays, heatmap-based hazard rendering
  (not stacked point markers), station markers with popups, a pySTEPS/DGMR model-comparison
  toggle, temperature/humidity/wind overlays across a wider region, click-to-inspect a
  region (dashed selection box, zoom, and a user-controlled 0-6h future-trend panel with
  its own chart), live countdown clocks, lead-time slider, legend. The original single-file
  HTML/JS version is kept at `nowcast/dashboard/legacy/index.html` for reference but is
  no longer maintained. Verified with a headless-browser pass (Playwright) — see below.

Not built: real hazard/satellite/radar access (blocked on §1 registration), SmaAt-UNet
fine-tuning (the plan's Option B for 4b — DGMR zero-shot, Option A, was built instead).

## Run it

Backend:
```bash
pip install -r requirements.txt
uvicorn nowcast.api.main:app --reload --port 8000
```
On startup it runs all three pullers once, fuses them, and serves immediately; it then
re-ingests + recomputes every `INGEST_CYCLE_MINUTES` (15 by default).

Dashboard:
```bash
cd nowcast/dashboard
npm install
npm run dev
```
Opens at `http://localhost:5173` and talks to the backend at `http://localhost:8000`.

## Verification

Endpoints were hit live and the dashboard was driven with Playwright (headless Chromium)
to confirm: map loads, all 4 hazard types render simultaneously and colocate on one
storm, satellite/radar PNG overlays render, the countdown clock actually ticks down in
real time, and the lead-time slider correctly advects the cloudburst layer via pySTEPS
while leaving the "now"-only hazards (hail/downburst/lightning) in place. Zero console
errors. Two real bugs were caught this way and fixed:
- pySTEPS' synthetic history window and the "now" snapshot didn't share a time origin,
  silently offsetting every forecast label by ~50 minutes.
- In the React rewrite, `MapProvider`'s map container and the rest of the UI ended up as
  DOM *siblings* instead of nested (because a Context.Provider renders no element of its
  own), and separately MapLibre's own stylesheet was overriding the container's
  `position: absolute` with its own `position: relative` on class-selector import-order —
  together these collapsed the map to zero height and silently ate every click. Fixed by
  moving the shell wrapper into `MapProvider` and setting position via inline style.
- Bhuvan's WMS ("Bhuvan Maps" base layer) returned a real tile via `curl` but failed
  silently in-browser — its server sends no CORS headers, so MapLibre's fetch-based tile
  loader was blocked. Confirmed by checking the actual error text (not just "tiles didn't
  load") and fixed with a same-origin backend proxy rather than dropping the layer.

## Next steps (in plan order)

1. Register MOSDAC + request IMD API access (project.md section 1) — do this first, it's
   the longest lead time item, and nothing above becomes "real" without it.
2. Implement `_fetch_live` in `imd_nowcast.py`, `satellite_insat.py`, `radar_puller.py`
   once access is granted — swap-in points are marked, schemas already match.
3. Once real radar CAPPI grids exist, downburst/hail thresholds should be re-validated
   against them — the current thresholds are textbook values, never checked against data.
4. Remaining stretch goals: multi-region coverage; historical validation against Bhuvan
   LDSN; SmaAt-UNet fine-tuning as a second deep-model comparison alongside DGMR.
