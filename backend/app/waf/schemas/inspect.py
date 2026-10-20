"""
Pydantic schemas for request inspection, findings, and inspection results.
"""
from datetime import datetime, timezone
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

from app.waf.constants import Decision, Severity, RuleAction


class InspectRequest(BaseModel):
    """Normalized incoming HTTP request to be evaluated by the WAF engine."""
    method: str = Field(default="GET", description="HTTP Method (GET, POST, etc.)")
    path: str = Field(default="/", description="URL path component")
    query_params: Dict[str, str] = Field(default_factory=dict, description="URL query parameters")
    headers: Dict[str, str] = Field(default_factory=dict, description="HTTP Request headers")
    body: Optional[str] = Field(default=None, description="Raw request body (text or serialized)")
    client_ip: str = Field(default="127.0.0.1", description="Client source IP address")
    user_agent: Optional[str] = Field(default=None, description="User agent string (or from headers)")


class Finding(BaseModel):
    """A specific rule match detected during inspection."""
    rule_id: str
    rule_name: str
    category: str
    severity: Severity
    action: RuleAction
    location: str  # e.g., "query:id", "header:User-Agent", "path", "body"
    matched_value: str
    description: str


class InspectResponse(BaseModel):
    """The structured WAF inspection decision and explanation."""
    request_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    decision: Decision
    risk_score: int = Field(ge=0, le=100)
    findings_count: int
    findings: List[Finding]
    processing_time_ms: float
    client_ip: str
    method: str
    path: str
    policy_mode: str  # "monitor" or "block"
