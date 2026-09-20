# MeghDrishti

Convective-scale nowcasting system (SIH 2026) — 0-6h thunderstorm/hail/downburst/cloudburst
nowcasting fusing IMD radar, INSAT satellite, and lightning data on a GIS dashboard.
Full plan: [`project.md`](project.md). One-page write-up: [`WRITEUP.md`](WRITEUP.md).

## Current status — Definition of Done (§8) satisfied

**The dashboard's default hazard view is real and country-wide, not a demo storm near one
city.** `/hazards` (`nowcast/models/hazard_india.py`) detects real hail and lightning
across all of India right now, straight from RainViewer reflectivity + Blitzortung
strikes — no synthetic storm, no fixed demo city. `/raw-layers`' radar overlay is the same
all-India RainViewer fetch. Downburst and cloudburst have no real all-India equivalent
(no public Doppler-velocity source anywhere, and no persisted real radar time-series for
pySTEPS to forecast from) and are intentionally absent from this view rather than faked at
country scale — see `hazard_india.py`'s docstring. The original per-region demo (all 4
hazard types, downburst/cloudburst synthetic-backed, for whichever of the 10 cities is
picked via "Demo region") still exists underneath and now lives at `/hazards/region`,
still driving the Forecast/Replay pages' pySTEPS/DGMR features.

MOSDAC/IMD *nowcast API* registration is still under review (see Next steps) — while
waiting, every hazard input has been replaced with **another free, real data source**
except radar's Doppler velocity (needed for the downburst rule — no public aggregator
publishes raw volumetric scans, so downburst stays fully synthetic). Every real source
below is opt-in via a `USE_LIVE_*` flag in `.env` (copy from `.env.example`) and falls
back to synthetic automatically if the live fetch fails.

- **Ingestion (2a/2b/2c)**: `nowcast/ingestion/{imd_nowcast,satellite_insat,radar_puller}.py`
  — `imd_nowcast.py` has a real live path via Tomorrow.io's realtime weather API
  (`USE_LIVE_IMD=true` + `TOMORROW_API_KEY`) for real temperature/humidity/wind/precip at
  the demo stations. Real lightning strikes are layered on top independently via
  Blitzortung.org (`USE_LIVE_LIGHTNING=true`, no key needed — see
  `nowcast/ingestion/blitzortung_lightning.py`), a free community VLF detection network,
  since neither IMD nor Tomorrow.io expose a lightning field. Radar reflectivity is real
  via RainViewer (`USE_LIVE_RADAR=true`, no key needed — see
  `nowcast/ingestion/rainviewer_radar.py`): its "Black and White" tile scheme is a direct
  greyscale-to-dBZ encoding, not a rendered color guess, and its India coverage is itself
  IMD's public radar network republished by a third party. `fetch_india_reflectivity()`
  fetches it across the whole country (tiles fanned out concurrently, ~3s) for the default
  hazard view and `/raw-layers`; `fetch_reflectivity()` still serves the smaller per-region
  demo bbox. Radial velocity (downburst) stays synthetic even with radar live, since no
  public source exposes it. Satellite is
  real via two sources (`USE_LIVE_SATELLITE=true`, each needs its own free account):
  EUMETSAT MSG SEVIRI (`nowcast/ingestion/eumetsat_satellite.py`, `EUMETSAT_CONSUMER_KEY`/
  `SECRET`) is tried first — geostationary, continuous coverage — but currently blocked
  by a `403` pending EUMETSAT-side license propagation (account registered, license
  accepted, still 403 — see module docstring), so it falls back to Copernicus Sentinel-3
  SLSTR
  (`nowcast/ingestion/copernicus_satellite.py`, `COPERNICUS_CLIENT_ID`/`SECRET`, verified
  live) if unconfigured or it fails. `wv`/`mwir` stay synthetic regardless (neither source
  has equivalent channels), and Sentinel-3 being polar-orbiting means frequent "no recent
  scene" fallbacks to synthetic are expected there, not a bug. Each puller runs
  independently; one failing doesn't block the others (`_ingest_all` in `api/main.py`).
- **Weather-variable grid**: `nowcast/processing/weather_fields.py` — real ECMWF Open Data
  (HRES forecast, 0.25°, updated 4x/day) via `nowcast/ingestion/ecmwf_weather.py` when
  `USE_LIVE_ECMWF=true`. Genuinely free, **no API key needed** — ECMWF's older key-based
  public-datasets service (`api.ecmwf.int`) was mostly decommissioned in 2023, so this uses
  their newer unauthenticated Open Data service instead. Falls back to the synthetic
  climatology+storm-perturbation grid on any failure.
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

Not built: real Doppler velocity for downburst (no public source exists outside
MOSDAC/IMD), SmaAt-UNet fine-tuning (the plan's Option B for 4b — DGMR zero-shot,
Option A, was built instead).

## Run it

Backend:
```bash
pip install -r requirements.txt
uvicorn nowcast.api.main:app --port 8000
```
On startup it runs all three pullers once, fuses them, and serves immediately; it then
re-ingests + recomputes every `INGEST_CYCLE_MINUTES` (15 by default).

**Don't add `--reload` for normal use** — this app continuously writes its own timestamped
data files into `nowcast/data/` (every ingest cycle, every region pre-warm), and uvicorn's
reloader watches the whole project directory by default. With `--reload` on, every one of
those writes looks like a source-code change and restarts the entire server mid-cycle,
which surfaces as `cannot schedule new futures after interpreter shutdown` errors from
whatever background fetch happened to be in flight — a genuine bug from `--reload`
fighting the app, not an app bug itself. If you're actively editing backend Python and
want `--reload`, exclude the data directory: `--reload --reload-exclude "nowcast/data/*"`.

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

1. MOSDAC/IMD nowcast API registration is submitted and under review (project.md section
   1) — once granted, swap `radar_puller.py`'s velocity over to a real MOSDAC source;
   everything else already has a real stand-in (see above).
2. Copernicus satellite integration (`copernicus_satellite.py`) is registered and
   verified live — real Sentinel-3 SLSTR brightness temperature confirmed across
   multiple regions. EUMETSAT MSG SEVIRI (`eumetsat_satellite.py`) is also wired in as
   a continuous-coverage companion (geostationary, updates every 15min, actually
   centered on India, vs Sentinel-3's ~1-2 passes/day) and tried first when both are
   configured — written against `eumdac`'s real, introspected API surface, but **not
   yet exercised against live credentials**, so it may need debugging once
   `EUMETSAT_CONSUMER_KEY`/`SECRET` are set.
3. Once real radar CAPPI grids or RainViewer's live feed have been observed against
   actual storms, downburst/hail thresholds should be re-validated — the current
   thresholds are textbook values, never checked against data.
4. Remaining stretch goals: multi-region coverage; historical validation against Bhuvan
   LDSN; SmaAt-UNet fine-tuning as a second deep-model comparison alongside DGMR.
