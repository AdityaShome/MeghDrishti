"""Rule-based hazard derivation (section 4c of project.md).

Deliberately not a trained classifier: no labeled hail/downburst ground
truth exists at hackathon timescale, and thresholds are explainable to
judges. Only hail-probability and lightning-density hazards are computable
from the IMD nowcast feed alone (2a); downburst needs real radar velocity
and cloudburst needs the pySTEPS rain-rate extrapolation (4a) — both return
None here until those layers exist.
"""
from nowcast.configs.settings import LIGHTNING_PROB_HIGH


def classify_station(record: dict) -> dict:
    lightning_prob = record.get("lightning_prob", 0.0)
    hail_flag = record.get("hail_flag", False)

    hazards = []
    if hail_flag and lightning_prob >= LIGHTNING_PROB_HIGH:
        hazards.append({"type": "hail", "severity": "high"})
    elif hail_flag:
        hazards.append({"type": "hail", "severity": "moderate"})

    if lightning_prob >= LIGHTNING_PROB_HIGH:
        hazards.append({"type": "lightning", "severity": "high"})
    elif lightning_prob >= 0.30:
        hazards.append({"type": "lightning", "severity": "moderate"})

    # downburst: requires radar radial-velocity couplet — not available from
    # the IMD nowcast feed alone. cloudburst: requires pySTEPS rain-rate
    # extrapolation (section 4a). Both intentionally omitted until built.

    return {**record, "hazards": hazards}
