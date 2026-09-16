"""
Web Security API — URI assessment, web stats, findings.
"""
import time
import random
from typing import List

from fastapi import APIRouter, HTTPException, status

from app.ai.rule_engine import rule_engine
from app.schemas.security import (
    WebSecurityStats,
    AttackTypeCount,
    URIAssessmentRequest,
    URIAssessmentResult,
)

router = APIRouter(prefix="/web-security", tags=["Web Security"])


@router.get("/stats", response_model=WebSecurityStats)
async def get_web_stats() -> WebSecurityStats:
    return WebSecurityStats(
        total_requests=12842,
        suspicious=342,
        confirmed_findings=67,
        critical_findings=9,
        high_findings=24,
        attack_types=[
            AttackTypeCount(name="SQL Injection",     count=28, color="#ef4444"),
            AttackTypeCount(name="XSS",               count=22, color="#f97316"),
            AttackTypeCount(name="SSRF",              count=8,  color="#00c8ff"),
            AttackTypeCount(name="CSRF",              count=5,  color="#8b5cf6"),
            AttackTypeCount(name="IDOR / BOLA",       count=4,  color="#f59e0b"),
            AttackTypeCount(name="Path Traversal",    count=6,  color="#00e5a0"),
            AttackTypeCount(name="Command Injection", count=3,  color="#3b82f6"),
            AttackTypeCount(name="File Upload",       count=2,  color="#a78bfa"),
            AttackTypeCount(name="Brute Force",       count=18, color="#fb923c"),
        ],
    )


@router.post("/assess", response_model=URIAssessmentResult)
async def assess_uri(body: URIAssessmentRequest) -> URIAssessmentResult:
    """
    Analyze a URI for suspicious patterns using the rule engine.
    IMPORTANT: Only for authorized applications and security testing.
    """
    if not body.uri.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="URI must start with http:// or https://",
        )

    t_start = time.perf_counter()

    # Run rule engine against the URI path
    path = body.uri.split("://", 1)[-1].split("/", 1)[-1] if "/" in body.uri else ""
    matches = rule_engine.evaluate_all(f"/{path}")

    duration = (time.perf_counter() - t_start) * 1000

    critical = sum(1 for m in matches if m.severity == "CRITICAL")
    high     = sum(1 for m in matches if m.severity == "HIGH")
    medium   = sum(1 for m in matches if m.severity == "MEDIUM")
    total    = len(matches)

    max_risk = max((int(m.confidence * 0.9) for m in matches), default=0)

    if total == 0:
        summary = "No suspicious patterns detected in URI. Endpoint appears safe."
    elif critical > 0:
        summary = f"CRITICAL: {critical} critical pattern(s) detected. Immediate action required."
    elif high > 0:
        summary = f"HIGH: {high} high-severity pattern(s) detected. Block and investigate."
    else:
        summary = f"{total} pattern(s) detected. Review and monitor endpoint."

    return URIAssessmentResult(
        uri=body.uri,
        scope=body.scope,
        risk_score=max_risk,
        findings=total,
        critical=critical,
        high=high,
        medium=medium,
        summary=summary,
        scan_duration=round(duration, 2),
    )
