"""
Security Events API endpoints.
Provides paginated, filterable security incident history and findings inspection.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.waf.models import User
from app.waf.schemas.event import PaginatedEvents
from app.waf.security.auth import get_current_user
from app.waf.services.event_service import event_service

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("", response_model=PaginatedEvents)
async def list_security_events(
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=20, ge=1, le=100, description="Items per page"),
    decision: Optional[str] = Query(default=None, description="Filter by decision (ALLOW, MONITOR, BLOCK)"),
    action: Optional[str] = Query(default=None, description="Filter by action (ALLOW, MONITOR, BLOCK, RATE_LIMIT)"),
    domain_id: Optional[str] = Query(default=None, description="Filter by registered domain ID"),
    min_risk: Optional[int] = Query(default=None, ge=0, le=100, description="Minimum risk score threshold"),
    search: Optional[str] = Query(default=None, description="Search by path, IP, or Request ID"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Returns a paginated list of sanitized security events (Authenticated users only)."""
    # Enforce organization/tenant boundary
    user_tenant = getattr(current_user, "tenant_id", "org-default") or "org-default"
    effective_tenant = None if current_user.role == "admin" else user_tenant

    return await event_service.get_events(
        session=session,
        page=page,
        limit=limit,
        decision=decision,
        action=action,
        domain_id=domain_id,
        min_risk=min_risk,
        search=search,
        tenant_id=effective_tenant,
    )

