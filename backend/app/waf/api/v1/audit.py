"""
Audit Logs API endpoint.
Exposes administrative operation records and configuration modification logs to authenticated admins.
"""
from datetime import datetime
import json
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.waf.models import User
from app.waf.security.auth import require_admin
from app.waf.services.audit_service import audit_service

router = APIRouter(prefix="/audit", tags=["Audit Logs"])


class AuditLogOut(BaseModel):
    id: str
    timestamp: datetime
    username: str
    action: str
    details: Optional[Dict[str, Any]] = None


class PaginatedAuditLogs(BaseModel):
    total: int
    page: int
    limit: int
    logs: List[AuditLogOut]


@router.get("/logs", response_model=PaginatedAuditLogs)
async def get_audit_logs(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    username: Optional[str] = Query(default=None),
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Retrieves administrative audit logs with pagination (Admin only)."""
    offset = (page - 1) * limit
    logs_raw, total = await audit_service.list_audit_logs(
        session=session,
        limit=limit,
        offset=offset,
        username=username,
    )

    logs_out: List[AuditLogOut] = []
    for l in logs_raw:
        details_parsed = None
        if l.details_json:
            try:
                details_parsed = json.loads(l.details_json)
            except Exception:
                details_parsed = {"raw": l.details_json}

        logs_out.append(
            AuditLogOut(
                id=l.id,
                timestamp=l.timestamp,
                username=l.username,
                action=l.action,
                details=details_parsed,
            )
        )

    return PaginatedAuditLogs(
        total=total,
        page=page,
        limit=limit,
        logs=logs_out,
    )
