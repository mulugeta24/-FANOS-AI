"""
Dashboard API — KPIs, threat activity, attack distribution.
All endpoints return mock/aggregated data suitable for the SOC dashboard.
In production these query the PostgreSQL database via SQLAlchemy.
"""
from typing import List

from fastapi import APIRouter

from pydantic import BaseModel
from app.schemas.security import (
    DashboardKPIs,
    ThreatActivityPoint,
    AttackDistributionItem,
)


class RiskDistributionItem(BaseModel):
    label: str
    count: int
    color: str
    max:   int

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/kpis", response_model=DashboardKPIs)
async def get_kpis() -> DashboardKPIs:
    """Return current security KPI summary."""
    return DashboardKPIs(
        critical_threats=7,   critical_change="+12%",
        active_incidents=24,  incidents_today=5,
        blocked_threats=156,  blocked_change="+18%",
        security_events=8421, events_change="+23%",
        ai_accuracy=99.84,    ai_f1_score=99.85,
        system_health=98.7,   sensors_online=12, sensors_total=12,
    )


@router.get("/threat-activity", response_model=List[ThreatActivityPoint])
async def get_threat_activity(hours: int = 24) -> List[ThreatActivityPoint]:
    """Return threat activity time-series for the last N hours."""
    data = [
        ("00:00", 12,  8,  3, 18),
        ("02:00", 18, 12,  5, 28),
        ("04:00",  8,  6,  2, 14),
        ("06:00", 22, 15,  7, 38),
        ("08:00", 45, 32, 12, 72),
        ("10:00", 68, 48, 18,110),
        ("12:00", 92, 65, 24,148),
        ("14:00", 78, 55, 20,128),
        ("16:00",105, 72, 28,172),
        ("18:00", 88, 62, 22,145),
        ("20:00", 65, 45, 16,108),
        ("22:00", 42, 30, 10, 72),
        ("24:00", 28, 20,  7, 48),
    ]
    return [
        ThreatActivityPoint(time=t, network=n, web=w, system=s, blocked=b)
        for t, n, w, s, b in data
    ]


@router.get("/attack-distribution", response_model=List[AttackDistributionItem])
async def get_attack_distribution() -> List[AttackDistributionItem]:
    """Return attack type distribution as percentages."""
    return [
        AttackDistributionItem(name="SQL Injection",  value=24, color="#ef4444"),
        AttackDistributionItem(name="XSS",            value=18, color="#f97316"),
        AttackDistributionItem(name="Brute Force",    value=16, color="#f59e0b"),
        AttackDistributionItem(name="DDoS",           value=14, color="#8b5cf6"),
        AttackDistributionItem(name="Port Scan",      value=12, color="#3b82f6"),
        AttackDistributionItem(name="SSRF",           value=7,  color="#00c8ff"),
        AttackDistributionItem(name="Path Traversal", value=5,  color="#00e5a0"),
        AttackDistributionItem(name="Other",          value=4,  color="#4a6080"),
    ]


@router.get("/risk-distribution", response_model=List[RiskDistributionItem])
async def get_risk_distribution() -> List[RiskDistributionItem]:
    """Return risk level counts for the horizontal bar chart."""
    items = [
        RiskDistributionItem(label="Critical", count=7,   color="#ef4444", max=110),
        RiskDistributionItem(label="High",     count=18,  color="#f97316", max=110),
        RiskDistributionItem(label="Medium",   count=42,  color="#f59e0b", max=110),
        RiskDistributionItem(label="Low",      count=86,  color="#3b82f6", max=110),
        RiskDistributionItem(label="Info",     count=103, color="#8b5cf6", max=110),
    ]
    return items
