"""
Pydantic schemas for security reports and export generation.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class ReportGenerateRequest(BaseModel):
    title: str
    time_range_hours: int = 24


class ReportOut(BaseModel):
    id: str
    title: str
    generated_at: datetime
    time_range: str
    total_inspected: int
    total_allowed: int
    total_monitored: int
    total_blocked: int
    summary: Dict[str, Any]
