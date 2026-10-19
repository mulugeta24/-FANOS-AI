"""
Request Inspection API endpoint.
Receives an HTTP request representation, applies the WAF inspection pipeline,
and returns an explainable decision with sanitized evidence.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.waf.engine.pipeline import pipeline
from app.waf.schemas.inspect import InspectRequest, InspectResponse
from app.waf.services.event_service import event_service

router = APIRouter(tags=["Inspection"])


@router.post("/inspect", response_model=InspectResponse)
async def inspect_request(
    request: InspectRequest,
    persist: bool = Query(default=True, description="Whether to persist this event to the audit database"),
    mode_override: str = Query(default=None, description="Optional policy mode override ('block' or 'monitor')"),
    session: AsyncSession = Depends(get_db),
):
    """
    Inspects an incoming HTTP request:
    1. Normalizes parameters, headers, body, path
    2. Runs active detection modules (SQLi, XSS, Path Traversal, CMDI, etc.)
    3. Computes deterministic risk score (0-100)
    4. Evaluates policy decision (ALLOW, MONITOR, BLOCK)
    5. Persists sanitized event to database
    6. Returns structured inspection outcome
    """
    response = pipeline.inspect(request, mode_override=mode_override)

    if persist:
        try:
            await event_service.log_event(request, response, session)
        except Exception:
            # Inspection decision should still return even if logging fails
            pass

    return response
