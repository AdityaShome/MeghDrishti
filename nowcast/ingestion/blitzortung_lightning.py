"""Real lightning strikes via Blitzortung.org (stand-in for IMD's lightning field).

Neither IMD's nowcast API (still under review) nor Tomorrow.io (already
integrated for temp/humidity/wind, see imd_nowcast.py) expose real lightning
data — Tomorrow.io's realtime endpoint has no lightning field at all. This
fills that specific gap with Blitzortung: a free, non-commercial, community
VLF lightning-detection network (~1800 receiver stations worldwide,
including India) that publishes real-time strikes over a public MQTT broker,
no API key or account needed.

Broker/topic (`blitzortung.ha.sed.pl:1883`, `blitzortung/1.1/#`) verified
against the widely-used homeassistant-blitzortung integration, which has
used this exact endpoint in production for years. We connect briefly
(`LISTEN_SECONDS`), collect whatever real strikes arrive filtered to a
padded box around REGION_BBOX, and disconnect — there's no need for a
persistent connection since this runs once per ingestion cycle.

Zero strikes in the listen window is a normal, valid result (no storm
nearby right now), not a failure — only a broker/network error raises.
"""
import json
import os
import sys
import time

import paho.mqtt.client as mqtt

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from nowcast.configs.settings import get_region_bbox

BROKER_HOST = "blitzortung.ha.sed.pl"
BROKER_PORT = 1883
TOPIC = "blitzortung/1.1/#"
LISTEN_SECONDS = 6
BBOX_PAD_DEG = 1.0  # catch strikes just outside REGION_BBOX that still matter to edge stations


def fetch_strikes():
    """Real lightning strikes seen in a short listen window, within a padded REGION_BBOX.

    Returns list of {lat, lon, time_unix} dicts (may be empty). Strike
    `time` from Blitzortung is nanoseconds since epoch; converted to seconds.
    """
    lon_min, lat_min, lon_max, lat_max = get_region_bbox()
    lon_min, lat_min = lon_min - BBOX_PAD_DEG, lat_min - BBOX_PAD_DEG
    lon_max, lat_max = lon_max + BBOX_PAD_DEG, lat_max + BBOX_PAD_DEG

    strikes = []
    connected = {"ok": False}

    def on_connect(client, userdata, flags, rc, properties=None):
        connected["ok"] = rc == 0
        client.subscribe(TOPIC)

    def on_message(client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
            lat, lon = payload.get("lat"), payload.get("lon")
            if lat is None or lon is None:
                return
            if lon_min <= lon <= lon_max and lat_min <= lat <= lat_max:
                strikes.append({"lat": lat, "lon": lon, "time_unix": payload.get("time", 0) / 1e9})
        except (ValueError, UnicodeDecodeError):
            pass  # occasional malformed frame from the public feed, not fatal

    client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(BROKER_HOST, BROKER_PORT, keepalive=LISTEN_SECONDS + 5)
    client.loop_start()
    time.sleep(LISTEN_SECONDS)
    client.loop_stop()
    client.disconnect()

    if not connected["ok"]:
        raise RuntimeError(f"could not connect to Blitzortung broker {BROKER_HOST}:{BROKER_PORT}")

    return strikes


if __name__ == "__main__":
    result = fetch_strikes()
    print(f"{len(result)} real strike(s) near REGION_BBOX in the last {LISTEN_SECONDS}s listen window")
    for s in result[:10]:
        print(s)
