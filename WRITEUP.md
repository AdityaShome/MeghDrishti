# MeghDrishti — One-Page Write-Up

Convective-scale nowcasting demo (SIH 2026): 0-6h thunderstorm/hail/downburst/cloudburst
nowcasting for a demo region (Pune district, Maharashtra), fusing radar, satellite, and
lightning data on a GIS dashboard with storm-arrival countdowns.

## Data sources: real vs. synthetic

**Everything in this build is synthetic.** No MOSDAC or IMD API credentials have been
granted yet (registration is the single longest-lead-time item and hasn't been completed
by the team) — see `README.md` for exact next steps. Every ingestion module
(`nowcast/ingestion/*.py`) is written with a `_fetch_live()` stub matching the documented
real API/schema, and a clearly-labeled mock generator as the current active path
(`USE_LIVE_IMD` / `USE_LIVE_SATELLITE` / `USE_LIVE_RADAR` env flags, all default `false`).

| Layer | Real source (planned) | Current source | Notes |
|---|---|---|---|
| Lightning/thunderstorm/hail flags | IMD nowcast API (district/station JSON) | Synthetic, weighted by distance to a fake storm cell | Schema matches the real feed exactly |
| Satellite IR/WV/MWIR | INSAT-3D/3DR via MOSDAC (`mdapi.py`) | Synthetic Gaussian cold-cloud-top field | Same storm, correlated cold top |
| Radar reflectivity + velocity | MOSDAC volumetric DWR (TERLS/SHAR) via `pyiwr`/Py-ART | Synthetic moving Gaussian cell + velocity couplet | No PNG-inversion shortcut taken |

All three mock generators share one canonical storm trajectory
(`nowcast/processing/storm_track.py`), so the fake sensors agree on where the storm is —
this was deliberately built (and one timing bug caught via live browser verification and
fixed) so the demo reads as one coherent storm, not disconnected synthetic layers.

## Model choices

- **pySTEPS (section 4a)**: Lucas-Kanade optical flow + semi-Lagrangian extrapolation on
  the synthetic reflectivity sequence, 0-6h at 10-min steps. This is the guaranteed-working
  baseline per the plan; no deep model was attempted (time-boxed out as a stretch goal —
  see `project.md` §4b).
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

- No real Indian data anywhere in the pipeline yet — MOSDAC/IMD access is unstarted.
  Every number on the dashboard is fabricated for demo purposes.
- Downburst and hail rules have never been validated against a real event; thresholds
  are physically motivated (standard meteorological literature values) but unverified.
- The demo storm is a single idealized Gaussian cell with constant velocity — real
  convection has multiple interacting cells, rotation, splitting/merging, none of which
  is modeled.
- pySTEPS extrapolation degrades as the storm exits the small demo bbox (~64×64 grid,
  ~50km across) after roughly 2 simulated hours; this is a real pySTEPS behavior on a
  genuinely moving storm, not an artifact, but it means the 6h forecast window is more
  illustrative than meaningful for this narrow demo region.
- No deep-learning nowcast (DGMR/SmaAt-UNet) is running — pySTEPS-only, per the plan's
  fallback-first guidance.
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

**Not done / stretch**: fine-tuned deep model comparison toggle, multi-region coverage,
historical validation against Bhuvan LDSN. None attempted — out of scope until real data
access exists.
