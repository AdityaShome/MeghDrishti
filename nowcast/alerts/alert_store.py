"""Persistent alert history (SQLite).

Replaces the earlier purely-in-memory `_alert_cooldowns` dict in
nowcast/api/main.py, which lost all alert history on every server
restart. A single-file SQLite DB is enough here — this is a hackathon-
scale deployment, not a reason to stand up Postgres/Mongo. Gives two real
things an in-memory dict couldn't: a cooldown that survives a restart,
and an actual audit trail of every alert sent (`list_recent`), which
backs the CAP feed in nowcast/api/main.py's `/alerts/cap` endpoint.
"""
import os
import sqlite3
import time

from nowcast.configs.settings import IMD_DIR

DB_PATH = os.path.join(os.path.dirname(IMD_DIR), "alerts.db")


def _connect():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            district TEXT NOT NULL,
            state TEXT,
            hazard_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            detail TEXT,
            sent_at REAL NOT NULL
        )
        """
    )
    return conn


def last_sent(district, state):
    """Unix timestamp of the most recent alert for this district, or None."""
    conn = _connect()
    try:
        row = conn.execute(
            "SELECT MAX(sent_at) FROM alerts WHERE district = ? AND state = ?",
            (district, state),
        ).fetchone()
        return row[0] if row and row[0] is not None else None
    finally:
        conn.close()


def record(district, state, hazard_type, severity, detail):
    conn = _connect()
    try:
        conn.execute(
            "INSERT INTO alerts (district, state, hazard_type, severity, detail, sent_at) VALUES (?, ?, ?, ?, ?, ?)",
            (district, state, hazard_type, severity, detail, time.time()),
        )
        conn.commit()
    finally:
        conn.close()


def list_recent(limit=50):
    """Most recent alerts first, for a history/audit view and the CAP feed."""
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT district, state, hazard_type, severity, detail, sent_at FROM alerts ORDER BY sent_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [
            {
                "district": r[0], "state": r[1], "hazard_type": r[2],
                "severity": r[3], "detail": r[4], "sent_at": r[5],
            }
            for r in rows
        ]
    finally:
        conn.close()
