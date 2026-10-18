"""
Incidents API — Direct PostgreSQL persistence for SOC Incident Response
"""
import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_async_session
from app.models.security import Incident
from app.schemas.security import IncidentOut, IncidentCreate, IncidentUpdate

logger = logging.getLogger("fanos.api.incidents")
router = APIRouter(prefix="/incidents", tags=["Incidents"])


async def _seed_initial_incidents_if_empty(session: AsyncSession):
    """Seed baseline SOC incidents if table has fewer than 2 records."""
    try:
        count_res = await session.execute(select(Incident))
        existing = count_res.scalars().all()
        if len(existing) < 2:
            now = datetime.now(timezone.utc)
            seeds = [
                Incident(
                    title="Credential Brute Force Campaign",
                    threat="Brute Force",
                    severity="HIGH",
                    source_ip="192.168.56.21",
                    status="Investigating",
                    risk_score=88,
                    assigned_to="SOC Analyst",
                    description="Multiple repeated SSH and HTTP authentication failures detected from Ubuntu VM subnet.",
                    created_at=now - timedelta(minutes=15),
                ),
                Incident(
                    title="Network Port Scan Detected",
                    threat="Port Scan",
                    severity="HIGH",
                    source_ip="192.168.56.31",
                    status="Contained",
                    risk_score=84,
                    assigned_to="Security Team",
                    description="Rapid SYN scan against ports 22, 80, 443, 8000. Automated perimeter firewall rule applied.",
                    created_at=now - timedelta(minutes=45),
                ),
                Incident(
                    title="Command Injection Attempt on API",
                    threat="Command Injection",
                    severity="CRITICAL",
                    source_ip="172.16.0.88",
                    status="Investigating",
                    risk_score=98,
                    assigned_to="M. Ababi",
                    description="Raw payload containing pipe syntax (|/bin/sh) intercepted by Suricata native collector.",
                    created_at=now - timedelta(minutes=60),
                ),
                Incident(
                    title="Cross-Site Scripting Wave",
                    threat="XSS",
                    severity="MEDIUM",
                    source_ip="10.0.0.44",
                    status="Resolved",
                    risk_score=62,
                    assigned_to="Security Team",
                    description="Reflected script tags filtered by WAF engine.",
                    created_at=now - timedelta(hours=3),
                    resolved_at=now - timedelta(hours=1),
                ),
            ]
            session.add_all(seeds)
            await session.commit()
            logger.info("Seeded initial baseline incidents into PostgreSQL.")
    except Exception as exc:
        logger.warning("Could not auto-seed baseline incidents: %s", exc)
        await session.rollback()


@router.get("/active", response_model=List[IncidentOut])
async def get_active_incidents(
    severity: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=200),
    session: AsyncSession = Depends(get_async_session),
) -> List[IncidentOut]:
    """Return open and active incidents from PostgreSQL."""
    await _seed_initial_incidents_if_empty(session)
    query = (
        select(Incident)
        .where(Incident.status.notin_(["Resolved", "Closed"]))
        .order_by(Incident.created_at.desc())
    )
    if severity:
        query = query.where(Incident.severity == severity.upper())
    query = query.limit(limit)

    result = await session.execute(query)
    return list(result.scalars().all())


@router.get("", response_model=List[IncidentOut])
@router.get("/", response_model=List[IncidentOut], include_in_schema=False)
async def list_incidents(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=100, le=200),
    offset: int = Query(default=0),
    session: AsyncSession = Depends(get_async_session),
) -> List[IncidentOut]:
    """Query and filter incidents from PostgreSQL."""
    await _seed_initial_incidents_if_empty(session)
    query = select(Incident).order_by(Incident.created_at.desc())
    if status_filter and status_filter.upper() != "ALL":
        query = query.where(Incident.status.ilike(status_filter))
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(
            (Incident.title.ilike(term))
            | (Incident.threat.ilike(term))
            | (Incident.source_ip.ilike(term))
        )
    query = query.offset(offset).limit(limit)

    result = await session.execute(query)
    return list(result.scalars().all())


@router.post("", response_model=IncidentOut, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=IncidentOut, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def create_incident(
    body: IncidentCreate,
    session: AsyncSession = Depends(get_async_session),
) -> IncidentOut:
    """Create a new incident in PostgreSQL."""
    new_inc = Incident(
        id=uuid.uuid4(),
        title=body.title,
        threat=body.threat,
        severity=body.severity.upper(),
        source_ip=body.source_ip,
        status=body.status,
        risk_score=body.risk_score,
        assigned_to=body.assigned_to,
        description=body.description,
        created_at=datetime.now(timezone.utc),
    )
    session.add(new_inc)
    await session.commit()
    await session.refresh(new_inc)
    return new_inc


@router.get("/{incident_id}", response_model=IncidentOut)
async def get_incident(
    incident_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
) -> IncidentOut:
    """Retrieve an incident by ID."""
    result = await session.execute(select(Incident).where(Incident.id == incident_id))
    inc = result.scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")
    return inc


@router.patch("/{incident_id}", response_model=IncidentOut)
async def update_incident(
    incident_id: uuid.UUID,
    body: IncidentUpdate,
    session: AsyncSession = Depends(get_async_session),
) -> IncidentOut:
    """Update incident status, assignee, or description with database persistence."""
    result = await session.execute(select(Incident).where(Incident.id == incident_id))
    inc = result.scalar_one_or_none()
    if not inc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found")

    if body.status is not None:
        inc.status = body.status
        if body.status in ("Resolved", "Closed"):
            inc.resolved_at = datetime.now(timezone.utc)
        elif inc.resolved_at is not None:
            inc.resolved_at = None

    if body.assigned_to is not None:
        inc.assigned_to = body.assigned_to

    if body.description is not None:
        inc.description = body.description

    await session.commit()
    await session.refresh(inc)
    return inc
