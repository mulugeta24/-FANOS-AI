"""
Security Events API
"""
import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_async_session
from app.models.security import SecurityEvent
from app.schemas.security import SecurityEventOut

logger = logging.getLogger("fanos.api.events")
router = APIRouter(prefix="/events", tags=["Events"])




@router.get("/live", response_model=List[SecurityEventOut])
async def get_live_events(
    limit: int = Query(default=50, ge=1, le=200),
    severity: Optional[str] = Query(default=None),
    sensor_source: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    session: AsyncSession = Depends(get_async_session),
) -> List[SecurityEventOut]:
    """Stream of most recent security events queried directly from PostgreSQL."""
    try:
        query = select(SecurityEvent).order_by(SecurityEvent.created_at.desc())
        if severity:
            query = query.where(SecurityEvent.severity == severity.upper())
        if sensor_source:
            query = query.where(SecurityEvent.sensor_source == sensor_source.lower())
        if search and search.strip():
            term = f"%{search.strip()}%"
            query = query.where(
                (SecurityEvent.source_ip.ilike(term))
                | (SecurityEvent.target.ilike(term))
                | (SecurityEvent.attack_type.ilike(term))
            )
        query = query.limit(limit)
        result = await session.execute(query)
        return list(result.scalars().all())
    except Exception as exc:
        logger.warning("Failed to query live events from DB: %s", exc)
        return []


@router.get("/{event_id}", response_model=SecurityEventOut)
async def get_event(
    event_id: uuid.UUID,
    session: AsyncSession = Depends(get_async_session),
) -> SecurityEventOut:
    """Get a single event by ID."""
    result = await session.execute(select(SecurityEvent).where(SecurityEvent.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Event not found")
    return event
