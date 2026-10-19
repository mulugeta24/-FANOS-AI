"""
Pydantic schemas for security events and paginated responses.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from app.waf.schemas.inspect import Finding


class SecurityEventOut(BaseModel):
    id: str
    request_id: str
    timestamp: datetime
    client_ip: str
    method: str
    path: str
    decision: str
    action: str = "ALLOW"
    risk_score: int
    findings_count: int
    findings: List[Finding]
    processing_time_ms: float
    policy_mode: str
    domain_id: Optional[str] = None
    hostname: Optional[str] = None
    tenant_id: Optional[str] = None
    http_status: int = 200
    origin_status: Optional[int] = None
    # Sanitized representations
    headers_sanitized: Optional[Dict[str, str]] = None
    query_sanitized: Optional[Dict[str, str]] = None
    body_sanitized: Optional[str] = None
    is_test: Optional[bool] = False


class PaginatedEvents(BaseModel):
    total: int
    page: int
    limit: int
    pages: int
    events: List[SecurityEventOut]
