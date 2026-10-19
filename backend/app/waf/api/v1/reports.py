"""
Reports and Export API endpoints.
Provides security assessment reports and sanitized data exports.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
from app.waf.models import ReportModel, User
from app.waf.schemas.report import ReportGenerateRequest, ReportOut
from app.waf.security.auth import get_current_user, require_admin
from app.waf.services.audit_service import audit_service
from app.waf.services.report_service import report_service
import json

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("", response_model=List[ReportOut])
async def list_reports(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Lists recent generated security reports (Authenticated users only)."""
    return await report_service.list_reports(session)


@router.post("/generate", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
async def generate_new_report(
    req: ReportGenerateRequest,
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Generates a new security summary report for the requested time window (Admin only)."""
    report = await report_service.generate_report(
        title=req.title,
        time_range_hours=req.time_range_hours,
        session=session,
    )

    try:
        await audit_service.log_action(
            username=current_user.username,
            action="REPORT_GENERATED",
            session=session,
            details={"report_id": report.id, "title": req.title, "hours": req.time_range_hours},
        )
    except Exception:
        pass

    return report


@router.get("/export/csv")
async def export_events_csv(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Exports sanitized security event records as a downloadable CSV file (Authenticated users only)."""
    csv_data = await report_service.export_events_csv(session)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=fanos_waf_events.csv"},
    )


@router.get("/{report_id}", response_model=ReportOut)
async def get_report_by_id(
    report_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Retrieves an existing security report by ID (Authenticated users only)."""
    stmt = select(ReportModel).where(ReportModel.id == report_id)
    res = await session.execute(stmt)
    report = res.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    return ReportOut(
        id=report.id,
        title=report.title,
        generated_at=report.generated_at,
        time_range=report.time_range,
        total_inspected=report.total_inspected,
        total_allowed=report.total_allowed,
        total_monitored=report.total_monitored,
        total_blocked=report.total_blocked,
        summary=json.loads(report.summary_json),
    )

