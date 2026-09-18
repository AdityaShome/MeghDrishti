# Implementation Plan: Convective-Scale Nowcasting System (SIH 2026)

Target: real-time 0-6 hr nowcasting of thunderstorms, hail, downburst, cloudburst at 1-3 km resolution, fusing IMD Doppler radar, INSAT-3D/3DR satellite, and lightning data, shown on a GIS dashboard with storm-arrival countdowns.

This doc is written for an autonomous coding agent to execute end to end. Follow phases in order. Each phase has a working checkpoint before moving on. Do not skip the checkpoint.

---

## 0. Non-negotiable constraints

- Ship something that runs end to end by Day 2. A live map with real IMD data beats a half-built ML model.
- MOSDAC account approval and IMD API whitelisting have unknown lag (hours to days). Kick these off in the first 30 minutes, before writing any code.
- No raw real-time gridded DWR feed exists for the full IMD network. Do not design the pipeline assuming one. Radar layer = MOSDAC volumetric datasets (where available) or PNG image overlay, not a live reflectivity grid for all of India.
- Budget GPU time. Do not train a model from scratch. Fine-tune a small model (SmaAt-UNet) or run a pretrained one (DGMR) zero-shot.
- Fallback path exists at every phase. If a data source stalls, degrade gracefully (see section 6).

---

## 1. Environment and accounts (do first, in parallel with nothing else)

1. Register at https://mosdac.gov.in/signup/ for MOSDAC SSO. Approval is required before download works — this is the single biggest schedule risk, start immediately.
2. Get IMD API access: check api.imd.gov.in documentation for whether it needs an API key or IP whitelist request. Submit the request now if needed.
3. Create accounts/tokens as needed:
   - AWS (for SEVIR dataset on Open Data Registry, and GPM IMERG on S3) — free tier is enough for download.
   - Google Earth Engine account (for GOES/Himawari/IMERG fallback, and GPM_L3 access) — free for research/hackathon use.
4. Set up repo structure:
```
nowcast/
  ingestion/       # pullers for each data source
  processing/      # regridding, alignment, feature extraction
  models/          # pysteps wrapper, deep model, hazard-threshold logic
  api/             # FastAPI service serving inference + hazard layers
  dashboard/       # MapLibre/React frontend
  data/            # local cache, gitignored
  notebooks/       # exploration only, not part of the pipeline
  configs/         # region bbox, thresholds, API keys (use .env, never commit)
```
5. Install core deps: `pysteps`, `xarray`, `pyresample`, `h5py`, `satpy`, `torch`, `fastapi`, `uvicorn`, `requests`, `pyiwr` (via git), `Py-ART`.

**Checkpoint 1**: repo scaffolded, MOSDAC signup submitted, IMD API request submitted, deps installed and importable.

---

## 2. Data ingestion layer

Build each puller as an independent, testable script with a scheduler hook (cron or APScheduler). Each puller writes to `data/<source>/<timestamp>.<ext>` and logs success/failure — never let one source's failure kill the others.

### 2a. IMD API nowcast (build this first — fastest to a working demo)
- Pull district-wise and station-wise nowcast JSON on a ~15-30 min cycle.
- Parse thunderstorm severity, lightning-probability category (Cat6 <30%, Cat11 30-60%, Cat19 >60%), hail flag (Cat17), and AWS/ARG surface obs.
- Store as normalized JSON: `{station_id, lat, lon, timestamp, ts_severity, lightning_prob_cat, hail_flag, ...}`.
- This alone can populate the dashboard with real hazard points on day one — do not wait on radar/satellite to start the dashboard.

### 2b. INSAT-3D/3DR satellite (MOSDAC)
- Use `mdapi.py` client (download from mosdac.gov.in/software/mdapi.zip) with `config.json` set to your credentials, `datasetId` (`3DIMG_L1B_STD` or `3DIMG_L1C_ASIA_MER`), bounding box for India (`68,6,98,38`), and a rolling time window.
- Pull TIR-1 (10.8 µm), WV (6.7 µm), and MWIR bands at minimum — these are the convective precursors (cold cloud tops, moisture).
- Parse HDF5 with `h5py`/`satpy`. Reproject to a common lat/lon grid with `pyresample`.
- If MOSDAC approval is delayed: use GOES-16/Himawari-8 IR/WV from Google Earth Engine or NASA GIBS as a placeholder, swap in INSAT once approved. Keep the ingestion interface identical (same output schema) so swapping source is a config change, not a rewrite.

### 2c. Radar
- Attempt MOSDAC volumetric DWR datasets (TERLS/SHAR) if in your target region; parse with `pyiwr` → Py-ART NetCDF → CAPPI grid.
- If your target region has no MOSDAC radar coverage: use the public PNG radar images (mausam.imd.gov.in/responsive/radar.php) as a visual overlay layer only — do not attempt to invert PNGs into quantitative reflectivity, it's unreliable and not worth agent time.
- Document clearly in the final submission which mode you used (raw quantitative vs. image overlay) — judges will ask.

### 2d. Lightning
- Primary: lightning-probability categories already coming from the IMD API nowcast feed (2a) — no separate ingestion needed for the live demo.
- Optional enrichment: NRSC Bhuvan LDSN portal (display-only, ~1 day lag) for historical validation, not real-time.

### 2e. Global fallback / training data
- Download SEVIR (github.com/MIT-AI-Accelerator/eie-sevir, AWS Open Data) for offline model training. This is not part of the live pipeline — it's your training set.
- Download GPM IMERG Early Run (via Google Earth Engine `NASA/GPM_L3/IMERG_V07` or S3 GES DISC) as a precipitation fallback layer if Indian radar coverage is thin in your target region.

**Checkpoint 2**: each puller runs standalone, writes normalized output, and failure in one does not crash the others. IMD API puller feeding real data into a local file.

---

## 3. Processing / fusion layer

1. Define a single target grid for your demo region (pick a state or a few districts — do not try to cover all of India, judges care about a working demo not national coverage). Grid resolution: 1-3 km, matching the problem statement.
2. Regrid satellite (4-8 km native) and radar (1 km native, where available) onto this common grid with `pyresample`. Nearest-neighbor or bilinear is fine — don't over-engineer.
3. Attach lightning-probability points to the nearest grid cell.
4. Stack aligned layers as channels: `[TIR1, WV, MWIR, reflectivity_or_precip, lightning_prob]` per timestep. This is the same structure SEVIR uses — lean on that as your reference schema.
5. Maintain a rolling buffer of the last ~1-2 hours of aligned frames (needed as model input context for both pySTEPS and any deep model).

**Checkpoint 3**: a single aligned multi-channel raster is produced every ingestion cycle and can be visualized as a sanity-check image.

---

## 4. Model layer

Build in this order — each stage is independently demoable, so if time runs out you still have something working.

### 4a. pySTEPS baseline (Day 2-3 target)
- Feed radar/precip frames into `pysteps` optical-flow + extrapolation.
- Output: motion field + extrapolated precip/reflectivity for 0-6 h at whatever cadence you choose (e.g., every 15-30 min step).
- This is your guaranteed-working nowcast. Do not proceed to 4b until this works end to end into the dashboard.

### 4b. Deep model differentiator (Day 5+ target, optional if time-constrained)
- Option A (less work): run DGMR pretrained weights (openclimatefix/skillful_nowcasting, HuggingFace Hub) zero-shot on your aligned radar/precip channel. Note it was trained on UK radar — expect domain shift, mention this as a known limitation.
- Option B (more control): fine-tune SmaAt-UNet (HansBambel/SmaAt-UNet) on SEVIR for a few epochs, then run inference on your live aligned rasters. SmaAt-UNet is small enough to fine-tune on a single GPU in hours, not days.
- Whichever you pick, keep pySTEPS running in parallel as the fallback/comparison — a "baseline vs. AI model" toggle on the dashboard is a good demo feature and de-risks a bad training run.

### 4c. Hazard derivation (rule-based, not deep learning — do this regardless of 4a/4b status)
Use physically-motivated thresholds on the fused fields, not a trained classifier — this is faster to build, explainable to judges, and doesn't need labeled hail/downburst data you don't have:
- **Hail probability**: reflectivity > 55-60 dBZ AND cold cloud top (TIR-1 very low brightness temp) AND lightning-probability category elevated.
- **Downburst**: strong radial-velocity couplet or sharp reflectivity gradient (only computable where you have real radar velocity data, not PNG-derived).
- **Cloudburst**: extrapolated/nowcast rain rate exceeding IMD's "very heavy rain" (>15 mm/hr) or the conventional cloudburst threshold (~100 mm/hr over the period).
- **Lightning density hazard**: directly from the IMD API category, no extra modeling needed.
- Document thresholds clearly in code comments and in the final report — judges will ask why these numbers.

**Checkpoint 4**: pySTEPS producing 0-6h extrapolated fields; hazard flags computed from thresholds; (optional) deep model producing a comparable output.

---

## 5. API and dashboard

### 5a. Backend (FastAPI)
- Endpoint: `GET /hazards?lead_time=Xmin` → returns GeoJSON of hazard zones (hail/downburst/cloudburst/lightning polygons or points) for the requested lead time.
- Endpoint: `GET /storm-eta` → returns storm-cell positions + motion vector + computed arrival ETA for key locations (derive ETA from pySTEPS motion field: distance / speed).
- Endpoint: `GET /raw-layers` → serves the raster imagery (satellite IR, radar) as map tiles or PNG overlays for the frontend.
- Keep inference synchronous but cached — recompute on the ingestion cycle (e.g., every 10-15 min), not on every API call.

### 5b. Frontend (MapLibre GL JS + React, or Leaflet + deck.gl)
- Base map: MapLibre (no token needed, unlike Mapbox).
- Layers: satellite IR overlay, radar overlay (image or data-driven), hazard zone polygons color-coded by type/severity, animated lightning points.
- Countdown clocks: for each active storm cell, show a live-updating "time to arrival" at key locations, computed from the ETA endpoint.
- Time slider: let judges scrub through 0-6h lead times to see the nowcast evolve.
- Reference implementations to look at for structure (not to copy wholesale): HailCast-ML (FrancescoCastaldi/hailcast-ml) for the hail dashboard + ETA cone pattern, Hazr (KurutoDenzeru/Hazr) for the MapLibre hazard-dashboard skeleton.

**Checkpoint 5**: dashboard loads, shows real hazard data from the IMD API feed at minimum, updates on a refresh cycle, and displays at least one countdown clock.

---

## 6. Fallback matrix (check this before panicking)

| If this stalls... | Do this instead |
|---|---|
| MOSDAC approval not through by day 2 | Use GOES-16/Himawari-8 IR/WV from Google Earth Engine as satellite layer; swap to INSAT later if approved |
| No radar coverage in target region | Use GPM IMERG precip as the extrapolation input instead of radar reflectivity; be upfront about this in the demo |
| GPU unavailable / training fails | Skip 4b entirely, ship pySTEPS + rule-based hazards only — this is a complete, defensible submission on its own |
| IMD API access denied or rate-limited | Cache/replay a recorded window of past nowcast JSON for the live demo, clearly labeled as "replay mode" |
| Time runs out before dashboard polish | Prioritize: (1) real data on a map, (2) at least one hazard type computed correctly, (3) one countdown clock working, over visual polish |

---

## 7. Demo narrative (prepare this alongside the build, not after)

Judges will ask "why these data sources, why this model, what's real vs. simulated." Prepare a one-slide answer:
- Which parts use real live Indian data vs. global fallback data, and why.
- Why rule-based hazard thresholds instead of a trained classifier (no labeled ground truth for hail/downburst events at hackathon timescale).
- What pySTEPS gives you vs. what the deep model adds (if built).
- Known limitations: domain shift if using DGMR pretrained-on-UK-radar; SEVIR trained on US GOES/NEXRAD if used for fine-tuning; radar coverage gaps.

---

## 8. Definition of done

Minimum viable submission:
- [ ] Live map showing real IMD nowcast hazard data (thunderstorm/lightning/hail categories) for a chosen region
- [ ] Satellite IR overlay (INSAT or fallback) aligned on the same map
- [ ] pySTEPS-based 0-6h extrapolation driving at least one hazard layer
- [ ] At least one rule-based hazard type computed (hail, downburst, or cloudburst) with documented thresholds
- [ ] At least one working storm-arrival countdown clock
- [ ] One-page write-up of data sources used, model choices, and known limitations

Stretch goals (only after the above is done):
- [ ] Fine-tuned deep model (SmaAt-UNet/DGMR) running alongside pySTEPS with a comparison toggle
- [ ] Multi-region coverage
- [ ] Historical validation against past severe-weather events using Bhuvan LDSN archive