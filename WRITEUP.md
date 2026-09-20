# MeghDrishti — One-Page Write-Up

Convective-scale nowcasting demo (SIH 2026): 0-6h thunderstorm/hail/downburst/cloudburst
nowcasting, fusing radar, satellite, and lightning data on a GIS dashboard with
storm-arrival countdowns. The dashboard's default hazard view detects real hail and
lightning across all of India right now (`nowcast/models/hazard_india.py`) — no demo city,
no synthetic storm. A second, older mode still exists underneath: a per-region demo
(`/hazards/region`, all 4 hazard types, downburst/cloudburst synthetic-backed) for
whichever of 10 major cities is picked, which still drives the Forecast/Replay pages'
pySTEPS/DGMR features.

## Data sources: real vs. synthetic

No MOSDAC or IMD *nowcast API* credentials have been granted yet (registration is the
single longest-lead-time item and hasn't been completed by the team) — see `README.md`
for exact next steps. In the meantime, most of the pipeline runs on other real, free
sources instead of staying synthetic — see the table below for exactly what's real and
what's synthetic per layer. Every ingestion module (`nowcast/ingestion/*.py`) is written
with a `_fetch_live()`/live-fetch stub matching the documented real API/schema, and a
clearly-labeled mock generator as the fallback path.

Two pieces of the pipeline now have real, opt-in live data instead, each behind a
`USE_LIVE_*` flag in `.env` (see `.env.example`), each falling back to synthetic
automatically on any fetch failure:

- **IMD station feed** (`nowcast/ingestion/imd_nowcast.py`): real temperature/humidity/
  wind/precip via Tomorrow.io's realtime weather API (`USE_LIVE_IMD=true` +
  `TOMORROW_API_KEY`). Tomorrow.io has no lightning field, so lightning/hail categories stay
  synthetic even with this on.
- **Weather-variable grid** (`nowcast/processing/weather_fields.py`): real ECMWF Open Data
  HRES forecast (`USE_LIVE_ECMWF=true`, no API key needed — see
  `nowcast/ingestion/ecmwf_weather.py`). ECMWF's older key-based public-datasets service
  (`api.ecmwf.int`) was mostly decommissioned in 2023; what remains (S2S, TIGGE) is
  weeks-to-months scale and useless for nowcasting, so this uses their newer unauthenticated
  Open Data service instead — real 0.25° HRES temperature/dewpoint/wind, updated 4x/day,
  CC-BY-4.0 licensed (attribution: ECMWF).
- **Radar reflectivity** (`nowcast/ingestion/radar_puller.py`): real via RainViewer
  (`USE_LIVE_RADAR=true`, no API key needed — see `nowcast/ingestion/rainviewer_radar.py`).
  RainViewer's "Black and White" (scheme 0) tile encoding is a direct linear greyscale-to-dBZ
  mapping (grey 1-127 → dBZ = grey-32), not a rendered color-ramp guess, so this is genuine
  quantitative reflectivity — and its India coverage is itself IMD's public radar network,
  republished by a third party rather than pulled from MOSDAC directly. No public source
  publishes raw Doppler volumetric scans, so radial velocity (needed for the downburst rule)
  stays synthetic even with this on.
- **Lightning** (`nowcast/ingestion/imd_nowcast.py` + `blitzortung_lightning.py`): real
  strikes via Blitzortung.org (`USE_LIVE_LIGHTNING=true`, no API key needed) — a free,
  community-run VLF lightning-detection network (~1800 stations worldwide, including India),
  streamed over a public MQTT broker. Fills a gap neither IMD nor Tomorrow.io cover
  (Tomorrow.io's realtime weather endpoint has no lightning field). Independent of
  `USE_LIVE_IMD`, applies on top of whichever station-data source is active. Each ingestion
  cycle listens for strikes in a short (~6s) window, so it under-samples relative to a
  persistent connection — zero strikes nearby is a normal, honest result, not a bug.
- **Satellite** (`nowcast/ingestion/satellite_insat.py` + two live sources, tried in
  order): **EUMETSAT MSG SEVIRI** (`eumetsat_satellite.py`, `EUMETSAT_CONSUMER_KEY`/
  `SECRET`) — geostationary, continuous 15min updates, actually centered on India;
  registered and auth/search confirmed working live, but currently **blocked by a 403**
  pending EUMETSAT-side license propagation (account registered, "Meteosat < 1 hr
  latency" license accepted, still 403 on both Data Tailor and direct Data Store
  download — see module docstring). One real bug was found and fixed along the way:
  `RegionOfInterest.NSWE` needs a plain list of floats, not the comma-joined string its
  type hint implies. Falls back to **Copernicus Sentinel-3 SLSTR**
  (`copernicus_satellite.py`, `COPERNICUS_CLIENT_ID`/`SECRET`) if EUMETSAT is
  unconfigured or fails — **verified live**, real brightness temperatures (246-323K,
  physically plausible) confirmed across Pune, Delhi, Chennai, and Guwahati. Neither
  source has a water-vapor or mid-wave-IR equivalent, so `wv`/`mwir` stay synthetic
  regardless of which one succeeds; Sentinel-3's polar orbit (~1-2 passes/day) means
  "no recent scene over this bbox" is an expected, frequent fallback there, not a bug.

| Layer | Real source (planned) | Current source | Notes |
|---|---|---|---|
| Lightning | IMD nowcast API (district/station JSON) | **Real via Blitzortung.org when `USE_LIVE_LIGHTNING=true`**, else synthetic proximity-to-fake-storm | Free community VLF network, no API key |
| Temp/humidity/wind at stations | IMD nowcast API | **Real via Tomorrow.io when `USE_LIVE_IMD=true`**, else synthetic | No lightning field, hence the separate Blitzortung path above |
| Weather-variable grid (temp/humidity/wind overlays) | ECMWF Open Data HRES | **Real when `USE_LIVE_ECMWF=true`**, else synthetic climatology+storm perturbation | No API key needed; falls back to synthetic on any failure |
| Satellite tir1 | INSAT-3D/3DR via MOSDAC (`mdapi.py`) | **Real via Copernicus Sentinel-3 SLSTR when `USE_LIVE_SATELLITE=true`**, else synthetic | Free CDSE account, verified live; wv/mwir stay synthetic regardless |
| Radar reflectivity | MOSDAC volumetric DWR (TERLS/SHAR) via `pyiwr`/Py-ART | **Real via RainViewer when `USE_LIVE_RADAR=true`**, all of India for the default hazard view/`/raw-layers`, else synthetic moving Gaussian cell | Genuine greyscale-to-dBZ decode, no API key |
| Hail + lightning hazards (default view) | IMD nowcast API | **Real, all of India, right now** — RainViewer reflectivity + Blitzortung strikes, `nowcast/models/hazard_india.py` | No synthetic storm; independent of the region picker entirely |
| Radar radial velocity (downburst) | MOSDAC volumetric DWR | Synthetic velocity couplet | No public source publishes raw Doppler scans |

**The map's GIS base/overlay layers are real, not synthetic.** 16 overlay layers (LULC,
basins, drainage, landslide/fire risk, rivers, roads, railways, airports, admin/taluka
boundaries, district population) and 7 base layers (Bhuvan Maps, OSM, DEM, LULC, Natural
Earth, Black/True Marble) are genuine ISRO/NRSC/MOSDAC WMS data, sourced by driving
MOSDAC's own live CloudBurst DSS (`mosdac.gov.in/cloudburst/`) with a real browser and
capturing each layer's actual WMS request — see `nowcast/dashboard/src/lib/mosdacLayers.ts`
for the full catalog and provenance notes. Bhuvan's WMS server doesn't send CORS headers,
so it's routed through a small passthrough proxy on our own backend (`/wms-proxy/bhuvan`
in `nowcast/api/main.py`) rather than fetched directly from the browser.

All three synthetic mock generators share one canonical storm trajectory
(`nowcast/processing/storm_track.py`), so the fake sensors agree on where the storm is —
this was deliberately built (and one timing bug caught via live browser verification and
fixed) so the demo reads as one coherent storm, not disconnected synthetic layers.

## Model choices

- **pySTEPS (section 4a)**: Lucas-Kanade optical flow + semi-Lagrangian extrapolation on
  the synthetic reflectivity sequence, 0-6h at 10-min steps. This is the guaranteed-working
  baseline per the plan.
- **DGMR (section 4b, stretch goal)**: DeepMind's pretrained Skillful Nowcasting GAN
  (`openclimatefix/dgmr` on HuggingFace, via the `dgmr` PyPI package), run zero-shot — real
  weights, no training, per the plan's "Option A: less work" path. Runs on CPU in
  ~3-11s/forecast, cached per ingestion cycle. **Its output is not calibrated mm/hr** — the
  model was trained on UK Met Office radar and we feed it synthetic input resized/normalized
  with a simple linear transform, not the original training pipeline's calibration. Small
  errors in an out-of-distribution input blow up enormously if run through the same
  Marshall-Palmer Z-R relation pySTEPS uses (observed six-figure "mm/hr" values in testing),
  so DGMR's output is deliberately kept as a unitless 0-1 relative intensity, shown only as
  a visual comparison layer (`/nowcast-frame?model=dgmr`, dashboard "Nowcast model" toggle)
  and never fed into the cloudburst hazard rule. This is the domain-shift limitation the
  plan explicitly asks to disclose, not a hidden gap — see `nowcast/models/dgmr_nowcast.py`.
- **Hazard rules are rule-based, not a trained classifier** — no labeled hail/downburst
  ground truth exists at hackathon timescale, and thresholds need to be explainable to
  judges. Thresholds (`nowcast/configs/settings.py`):
  - Hail: reflectivity ≥ 55 dBZ AND TIR-1 ≤ 210K AND lightning-prob ≥ 0.30, all collocated.
  - Downburst: local radial-velocity delta (max − min in a 5-cell window) ≥ 25 m/s.
  - Cloudburst: pySTEPS-extrapolated rain rate ≥ 15 mm/hr (IMD "very heavy rain").
  - Lightning: IMD probability category thresholds (Cat11/Cat19 boundaries).
- **ETA/motion**: derived from the same pySTEPS Lucas-Kanade field (bearing + speed),
  not a separate model.

## Known limitations

- MOSDAC/IMD *nowcast API* access is still under review. Five non-MOSDAC real sources are
  wired in as opt-in live paths in the meantime: Tomorrow.io (station temp/humidity/wind),
  ECMWF Open Data (weather grid), RainViewer (radar reflectivity — itself IMD radar data,
  just republished by a third party), Blitzortung.org (real lightning strikes), and
  Copernicus Sentinel-3 SLSTR (satellite tir1, verified live). Radar radial velocity (for
  downburst) has no free replacement and remains fully synthetic; satellite wv/mwir stay
  synthetic even with Copernicus live.
- Downburst and hail rules have never been validated against a real event; thresholds
  are physically motivated (standard meteorological literature values) but unverified.
- The demo storm is a single idealized Gaussian cell with constant velocity — real
  convection has multiple interacting cells, rotation, splitting/merging, none of which
  is modeled.
- pySTEPS extrapolation degrades as the storm exits the small demo bbox (~64×64 grid,
  ~50km across) after roughly 2 simulated hours; this is a real pySTEPS behavior on a
  genuinely moving storm, not an artifact, but it means the 6h forecast window is more
  illustrative than meaningful for this narrow demo region.
- DGMR's forecast is not quantitatively meaningful for this input (see Model choices) —
  it demonstrates that a real pretrained deep model integrates cleanly into the pipeline,
  not that its output is trustworthy here. SmaAt-UNet fine-tuning (the plan's Option B)
  was not attempted.
- `/raw-layers` and hazard grid rules regenerate on each cache refresh from freshly-pulled
  mock files, not a persisted time series — there's no real "rolling buffer of actual
  observations" yet, only the in-memory fusion buffer scaffold.

## Definition of done — status

All items below are demoable — see the table above for exactly which are real vs.
synthetic (most now run on real data, opt-in via `.env`):

- [x] Live map showing hazard data (lightning/hail categories), default view real and
      all-India, not scoped to a demo region
- [x] Satellite IR overlay aligned on the same map — real (Copernicus Sentinel-3),
      region-scoped
- [x] pySTEPS-based 0-6h extrapolation driving the cloudburst hazard layer (per-region
      demo mode, `/hazards/region`) — synthetic input, real pySTEPS
- [x] Hail (grid rule, real all-India by default) and downburst (velocity couplet,
      synthetic — no real source exists) computed with documented thresholds
- [x] Storm-arrival countdown clock, ETA derived from real pySTEPS motion estimation
      (per-region demo mode)
- [x] This write-up

**Stretch goals achieved**:
- DGMR (real pretrained deep model) alongside pySTEPS with a comparison toggle — see
  Model choices above for the calibration caveat.
- Real ISRO/MOSDAC/Bhuvan GIS base and overlay layers (23 total) — not part of the
  original plan, added directly from a real source the user pointed to.
- Real hail + lightning detection across all of India, independent of the region picker
  entirely — not part of the original plan (which scoped everything to one demo region);
  added once real radar (RainViewer) and lightning (Blitzortung) sources existed to make
  it possible without a synthetic storm.
- Real weather sources beyond the original plan's scope: Tomorrow.io, ECMWF Open Data,
  RainViewer, Blitzortung.org, Copernicus Sentinel-3 (EUMETSAT MSG SEVIRI written but
  blocked on a licensing 403, see README).

**Not done**: multi-region coverage, historical validation against Bhuvan LDSN,
SmaAt-UNet fine-tuning. Out of scope until real hazard-data access exists.
