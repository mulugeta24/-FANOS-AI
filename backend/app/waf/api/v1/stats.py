"""
Dashboard Statistics API endpoint.
Provides real-time aggregated metrics calculated from database events.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.waf.schemas.stats import StatsSummary
from app.waf.services.stats_service import stats_service

router = APIRouter(prefix="/stats", tags=["Statistics"])


@router.get("", response_model=StatsSummary)
async def get_dashboard_stats(session: AsyncSession = Depends(get_db)):
    """Returns aggregated security statistics, severity counts, and attack categories."""
    return await stats_service.get_summary_stats(session)
