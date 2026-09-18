"""Storm-arrival ETA (section 5a `/storm-eta`).

Real implementation derives motion vectors from pySTEPS optical flow
(section 4a) and computes distance/speed to target locations. Until 4a is
built, this uses a placeholder synthetic motion vector so the endpoint and
dashboard countdown clock are demoable end to end (constraint 0).
"""
import math
import random

# Placeholder regional motion: storms in this demo region typically track
# ENE at ~25-35 km/h during monsoon convection — replace with real
# pySTEPS-derived vector once available.
_PLACEHOLDER_BEARING_DEG = 60
_PLACEHOLDER_SPEED_KMH = 30


def _haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def storm_cells(hazard_records: list) -> list:
    """Build storm-cell ETA entries for stations with an active hazard."""
    cells = []
    for rec in hazard_records:
        if not rec.get("hazards"):
            continue
        speed = _PLACEHOLDER_SPEED_KMH + random.uniform(-5, 5)
        dist_km = random.uniform(5, 40)
        eta_min = round((dist_km / speed) * 60, 1)
        cells.append(
            {
                "station_id": rec["station_id"],
                "name": rec.get("name"),
                "lat": rec["lat"],
                "lon": rec["lon"],
                "bearing_deg": _PLACEHOLDER_BEARING_DEG,
                "speed_kmh": round(speed, 1),
                "distance_km": round(dist_km, 1),
                "eta_minutes": eta_min,
                "hazards": rec["hazards"],
                "motion_source": "placeholder",  # swap to "pysteps" once 4a lands
            }
        )
    return cells
