"""
Audit Logging Service for FANOS WAF.
Records administrative and security-relevant configuration changes to the database.
Ensures accountability for rule alterations, policy shifts, and authentication events.
"""
from datetime import datetime, timezone
import json
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.waf.models import AuditLogModel


class AuditService:
    """Service for managing tamper-evident administrative audit logs."""

    async def log_action(
        self,
        username: str,
        action: str,
        session: AsyncSession,
        details: Optional[Dict[str, Any]] = None,
    ) -> AuditLogModel:
        """Records an audit log entry in the database."""
        details_str = json.dumps(details) if details else None
        audit_entry = AuditLogModel(
            username=username,
            action=action,
            details_json=details_str,
            timestamp=datetime.now(timezone.utc),
        )
        session.add(audit_entry)
        await session.commit()
        await session.refresh(audit_entry)
        return audit_entry

    async def list_audit_logs(
        self,
        session: AsyncSession,
        limit: int = 50,
        offset: int = 0,
        username: Optional[str] = None,
    ) -> Tuple[List[AuditLogModel], int]:
        """Queries audit logs with pagination."""
        query = select(AuditLogModel)
        if username:
            query = query.where(AuditLogModel.username == username)

        count_query = select(func.count()).select_from(query.subquery())
        total_res = await session.execute(count_query)
        total = total_res.scalar() or 0

        query = query.order_by(desc(AuditLogModel.timestamp)).offset(offset).limit(limit)
        res = await session.execute(query)
        logs = res.scalars().all()

        return list(logs), total


audit_service = AuditService()
