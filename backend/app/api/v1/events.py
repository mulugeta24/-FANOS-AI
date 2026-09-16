"""
Security Events API
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Query

from app.schemas.security import SecurityEventOut

router = APIRouter(prefix="/events", tags=["Events"])


def _make_event(
    sev: str, attack: str, src: str, target: str,
    conf: float, risk: int, status: str, mins_ago: int,
) -> SecurityEventOut:
    return SecurityEventOut(
        id=uuid.uuid4(),
        severity=sev,
        attack_type=attack,
        source_ip=src,
        target=target,
        ai_confidence=conf,
        risk_score=risk,
        status=status,
        sensor_source="fanos-ai",
        created_at=datetime.now(timezone.utc) - timedelta(minutes=mins_ago),
    )


LIVE_EVENTS = [
    ("CRITICAL", "SQL Injection",     "192.168.56.10", "/login",           98.7, 96, "BLOCKED",       2),
    ("HIGH",     "Brute Force",       "192.168.56.21", "/admin/login",     97.1, 88, "BLOCKED",       5),
    ("HIGH",     "Port Scan",         "192.168.56.31", "Internal Network", 99.2, 84, "BLOCKED",       8),
    ("MEDIUM",   "Suspicious URI",    "192.168.56.42", "/search",          91.4, 64, "MONITORED",    12),
    ("LOW",      "Anomalous Traffic", "192.168.56.55", "Web Server",       82.3, 38, "ALERT",        15),
    ("HIGH",     "XSS Attempt",       "10.0.0.44",     "/comment",         95.8, 80, "BLOCKED",      17),
    ("CRITICAL", "Command Injection", "172.16.0.88",   "/api/exec",        99.1, 98, "BLOCKED",      20),
    ("MEDIUM",   "SSRF",              "192.168.1.100", "/fetch?url=",      88.5, 62, "INVESTIGATING",23),
]


@router.get("/live", response_model=List[SecurityEventOut])
async def get_live_events(
    limit: int = Query(default=20, le=100),
    severity: Optional[str] = Query(default=None),
) -> List[SecurityEventOut]:
    """Stream of most recent security events."""
    events = [_make_event(*row) for row in LIVE_EVENTS]
    if severity:
        events = [e for e in events if e.severity == severity.upper()]
    return events[:limit]


@router.get("/{event_id}", response_model=SecurityEventOut)
async def get_event(event_id: uuid.UUID) -> SecurityEventOut:
    """Get a single event by ID."""
    # In production: query DB. Here we return a placeholder.
    return _make_event("HIGH", "SQL Injection", "192.168.56.10", "/login", 98.7, 96, "BLOCKED", 2)
