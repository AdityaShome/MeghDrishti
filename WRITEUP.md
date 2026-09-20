# MeghDrishti — One-Page Write-Up

Convective-scale nowcasting demo (SIH 2026): 0-6h thunderstorm/hail/downburst/cloudburst
nowcasting for a demo region (Pune district, Maharashtra), fusing radar, satellite, and
lightning data on a GIS dashboard with storm-arrival countdowns.

## Data sources: real vs. synthetic

**Hazard/satellite/radar data (hail, downburst, cloudburst, satellite, radar) is still
synthetic.** No MOSDAC or IMD *nowcast API* credentials have been granted yet (registration
is the single longest-lead-time item and hasn't been completed by the team) — see
`README.md` for exact next steps. Every ingestion module (`nowcast/ingestion/*.py`) is
written with a `_fetch_live()`/live-fetch stub matching the documented real API/schema, and
a clearly-labeled mock generator as the fallback path.

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

| Layer | Real source (planned) | Current source | Notes |
|---|---|---|---|
| Lightning/thunderstorm/hail flags | IMD nowcast API (district/station JSON) | Synthetic, weighted by distance to a fake storm cell | Schema matches the real feed exactly; temp/humidity/wind at stations can be real via Tomorrow.io (`USE_LIVE_IMD`) |
| Weather-variable grid (temp/humidity/wind overlays) | ECMWF Open Data HRES | **Real when `USE_LIVE_ECMWF=true`**, else synthetic climatology+storm perturbation | No API key needed; falls back to synthetic on any failure |
| Satellite IR/WV/MWIR | INSAT-3D/3DR via MOSDAC (`mdapi.py`) | Synthetic Gaussian cold-cloud-top field | Same storm, correlated cold top |
| Radar reflectivity + velocity | MOSDAC volumetric DWR (TERLS/SHAR) via `pyiwr`/Py-ART | Synthetic moving Gaussian cell + velocity couplet | No PNG-inversion shortcut taken |

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

- No real Indian government data (MOSDAC/IMD) in the pipeline yet — that access is
  unstarted. Two non-Indian real sources (Tomorrow.io, ECMWF Open Data) are wired in as
  opt-in live paths for the station feed and weather grid respectively; hazard/satellite/
  radar remain fully synthetic.
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

All items below are demoable, using synthetic data throughout (see table above):

- [x] Live map showing hazard data (thunderstorm/lightning/hail categories) for the demo region — synthetic
- [x] Satellite IR overlay aligned on the same map — synthetic
- [x] pySTEPS-based 0-6h extrapolation driving the cloudburst hazard layer — synthetic input, real pySTEPS
- [x] Hail (grid rule) and downburst (velocity couplet) computed with documented thresholds
- [x] Storm-arrival countdown clock, ETA derived from real pySTEPS motion estimation
- [x] This write-up

**Stretch goals achieved**:
- DGMR (real pretrained deep model) alongside pySTEPS with a comparison toggle — see
  Model choices above for the calibration caveat.
- Real ISRO/MOSDAC/Bhuvan GIS base and overlay layers (23 total) — not part of the
  original plan, added directly from a real source the user pointed to.

**Not done**: multi-region coverage, historical validation against Bhuvan LDSN,
SmaAt-UNet fine-tuning. Out of scope until real hazard-data access exists.
