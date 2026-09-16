"""
Incidents API
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.security import IncidentOut, IncidentUpdate

router = APIRouter(prefix="/incidents", tags=["Incidents"])


def _ts(mins_ago: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(minutes=mins_ago)


INCIDENTS = [
    IncidentOut(id=uuid.uuid4(), title="SQL Injection Campaign",   threat="SQL Injection",      severity="CRITICAL", source_ip="192.168.56.10", status="Investigating", risk_score=96, assigned_to="SOC Analyst",  created_at=_ts(2)),
    IncidentOut(id=uuid.uuid4(), title="Credential Attack",         threat="Brute Force",        severity="HIGH",     source_ip="192.168.56.21", status="Contained",    risk_score=88, assigned_to="Security Team", created_at=_ts(8)),
    IncidentOut(id=uuid.uuid4(), title="Network Reconnaissance",    threat="Port Scan",          severity="HIGH",     source_ip="192.168.56.31", status="Blocked",      risk_score=84, assigned_to="SOC Analyst",  created_at=_ts(15)),
    IncidentOut(id=uuid.uuid4(), title="Command Injection Attempt", threat="Command Injection",  severity="CRITICAL", source_ip="172.16.0.88",   status="Investigating", risk_score=98, assigned_to="M. Ababi",    created_at=_ts(20)),
    IncidentOut(id=uuid.uuid4(), title="XSS Wave",                  threat="XSS",                severity="HIGH",     source_ip="10.0.0.44",     status="Contained",    risk_score=80, assigned_to="Security Team", created_at=_ts(30)),
]


@router.get("/active", response_model=List[IncidentOut])
async def get_active_incidents(
    severity: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=200),
) -> List[IncidentOut]:
    """Return all open/active incidents."""
    incidents = [i for i in INCIDENTS if i.status not in ("Resolved", "Closed")]
    if severity:
        incidents = [i for i in incidents if i.severity == severity.upper()]
    return incidents[:limit]


@router.get("/", response_model=List[IncidentOut])
async def list_incidents(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0),
) -> List[IncidentOut]:
    incidents = list(INCIDENTS)
    if status_filter:
        incidents = [i for i in incidents if i.status.lower() == status_filter.lower()]
    return incidents[offset : offset + limit]


@router.get("/{incident_id}", response_model=IncidentOut)
async def get_incident(incident_id: uuid.UUID) -> IncidentOut:
    for inc in INCIDENTS:
        if inc.id == incident_id:
            return inc
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")


@router.patch("/{incident_id}", response_model=IncidentOut)
async def update_incident(incident_id: uuid.UUID, body: IncidentUpdate) -> IncidentOut:
    for inc in INCIDENTS:
        if inc.id == incident_id:
            if body.status:
                inc.status = body.status
            if body.assigned_to:
                inc.assigned_to = body.assigned_to
            return inc
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
