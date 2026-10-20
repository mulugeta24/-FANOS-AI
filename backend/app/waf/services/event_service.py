"""
Service for persisting and querying sanitized security audit events.
"""
import json
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.waf.engine.redactor import redactor
from app.waf.models import SecurityEventModel
from app.waf.schemas.event import PaginatedEvents, SecurityEventOut
from app.waf.schemas.inspect import Finding, InspectRequest, InspectResponse


class EventService:
    """Handles persistence and retrieval of security events."""

    async def log_event(
        self,
        request: InspectRequest,
        response: InspectResponse,
        session: AsyncSession,
        domain_id: Optional[str] = None,
        hostname: Optional[str] = None,
        tenant_id: Optional[str] = None,
        http_status: int = 200,
        origin_status: Optional[int] = None,
        action: Optional[str] = None,
        is_test: bool = False,
    ) -> SecurityEventModel:
        """Sanitizes sensitive data and saves the security event."""
        sanitized_headers = redactor.redact_headers(request.headers)
        sanitized_query = redactor.redact_params(request.query_params)
        sanitized_body = redactor.redact_body(request.body) if request.body else None

        # Determine effective action
        effective_action = action or response.decision.value

        # Serialize findings safely
        findings_data = [f.model_dump() for f in response.findings]

        event = SecurityEventModel(
            request_id=response.request_id,
            timestamp=response.timestamp,
            client_ip=response.client_ip,
            method=response.method,
            path=response.path,
            decision=response.decision.value,
            action=effective_action,
            risk_score=response.risk_score,
            findings_count=response.findings_count,
            findings_json=json.dumps(findings_data),
            processing_time_ms=response.processing_time_ms,
            policy_mode=response.policy_mode,
            domain_id=domain_id,
            hostname=hostname,
            tenant_id=tenant_id,
            http_status=http_status,
            origin_status=origin_status,
            headers_sanitized_json=json.dumps(sanitized_headers),
            query_sanitized_json=json.dumps(sanitized_query),
            body_sanitized=sanitized_body,
            is_test=is_test,
        )

        try:
            session.add(event)
            await session.commit()
            return event
        except Exception:
            if session.is_active:
                await session.rollback()
            raise

    async def get_events(
        self,
        session: AsyncSession,
        page: int = 1,
        limit: int = 20,
        decision: Optional[str] = None,
        action: Optional[str] = None,
        domain_id: Optional[str] = None,
        min_risk: Optional[int] = None,
        search: Optional[str] = None,
        tenant_id: Optional[str] = None,
    ) -> PaginatedEvents:
        """Retrieves paginated and filtered security events."""
        query = select(SecurityEventModel).where(SecurityEventModel.request_id.isnot(None))

        if decision:
            query = query.where(SecurityEventModel.decision == decision.upper())
        if action:
            query = query.where(SecurityEventModel.action == action.upper())
        if domain_id and domain_id != "all":
            clean_dom = domain_id.strip()
            if "://" in clean_dom:
                clean_dom = clean_dom.split("://", 1)[1]
            if ":" in clean_dom:
                clean_dom = clean_dom.split(":", 1)[0]
            clean_dom = clean_dom.rstrip("/").lower()

            query = query.where(
                (SecurityEventModel.domain_id == domain_id.strip())
                | (SecurityEventModel.hostname.ilike(clean_dom))
                | (SecurityEventModel.hostname.ilike(domain_id.strip()))
            )
        if tenant_id and tenant_id != "all":
            query = query.where(SecurityEventModel.tenant_id == tenant_id)
        if min_risk is not None:
            query = query.where(SecurityEventModel.risk_score >= min_risk)
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                (SecurityEventModel.path.ilike(search_filter))
                | (SecurityEventModel.client_ip.ilike(search_filter))
                | (SecurityEventModel.request_id.ilike(search_filter))
                | (SecurityEventModel.hostname.ilike(search_filter))
                | (SecurityEventModel.findings_json.ilike(search_filter))
            )

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_res = await session.execute(count_query)
        total = total_res.scalar() or 0

        # Paginate
        offset = (page - 1) * limit
        query = query.order_by(desc(SecurityEventModel.timestamp), desc(SecurityEventModel.id)).offset(offset).limit(limit)

        result = await session.execute(query)
        rows = result.scalars().all()

        events_out: List[SecurityEventOut] = []
        for row in rows:
            try:
                findings_raw = json.loads(row.findings_json) if row.findings_json else []
                findings = [Finding(**f) for f in findings_raw]
            except Exception:
                findings = []

            headers_sanitized = json.loads(row.headers_sanitized_json) if row.headers_sanitized_json else None
            query_sanitized = json.loads(row.query_sanitized_json) if row.query_sanitized_json else None

            events_out.append(
                SecurityEventOut(
                    id=str(row.id),
                    request_id=getattr(row, "request_id", None) or f"req-{str(row.id)[:8]}",
                    timestamp=row.timestamp,
                    client_ip=getattr(row, "client_ip", None) or "0.0.0.0",
                    method=getattr(row, "method", None) or "GET",
                    path=getattr(row, "path", None) or "/",
                    decision=getattr(row, "decision", None) or "ALLOW",
                    action=getattr(row, "action", getattr(row, "decision", "ALLOW")) or "ALLOW",
                    risk_score=row.risk_score or 0,
                    findings_count=row.findings_count or 0,
                    findings=findings,
                    processing_time_ms=row.processing_time_ms or 0.0,
                    policy_mode=row.policy_mode or "monitor",
                    domain_id=row.domain_id,
                    hostname=row.hostname,
                    tenant_id=row.tenant_id,
                    http_status=getattr(row, "http_status", 200) or 200,
                    origin_status=row.origin_status,
                    headers_sanitized=headers_sanitized,
                    query_sanitized=query_sanitized,
                    body_sanitized=row.body_sanitized,
                    is_test=getattr(row, "is_test", False) or False,
                )
            )

        total_pages = max(1, (total + limit - 1) // limit)
        return PaginatedEvents(
            total=total,
            page=page,
            limit=limit,
            pages=total_pages,
            events=events_out,
        )


event_service = EventService()
