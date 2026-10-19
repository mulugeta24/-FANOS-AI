"""
Pydantic schemas for dashboard overview and analytics statistics.
"""
from typing import Dict, List
from pydantic import BaseModel


class SeverityCount(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    info: int = 0


class CategoryCount(BaseModel):
    category: str
    count: int


class DecisionCount(BaseModel):
    allow: int = 0
    monitor: int = 0
    block: int = 0


class HourlyActivity(BaseModel):
    hour: str
    inspected: int
    blocked: int
    monitored: int


class StatsSummary(BaseModel):
    total_inspected: int
    total_allowed: int
    total_monitored: int
    total_blocked: int
    active_rules_count: int
    custom_rules_count: int
    current_mode: str
    total_domains: int = 0
    verified_domains: int = 0
    active_domains: int = 0
    severity_distribution: SeverityCount
    top_attack_categories: List[CategoryCount]
    recent_activity_timeline: List[HourlyActivity]
