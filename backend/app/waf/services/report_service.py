"""
Service for generating and exporting security assessment reports in JSON and CSV formats.
"""
import csv
import io
import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.waf.models import ReportModel, SecurityEventModel
from app.waf.schemas.report import ReportOut


class ReportService:
    """Handles report generation and sanitized data export."""

    async def generate_report(
        self,
        title: str,
        time_range_hours: int,
        session: AsyncSession,
    ) -> ReportOut:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=time_range_hours)

        # Query events within time window
        stmt = select(SecurityEventModel).where(SecurityEventModel.timestamp >= cutoff)
        res = await session.execute(stmt)
        events = res.scalars().all()

        total = len(events)
        allowed = sum(1 for e in events if e.decision == "ALLOW")
        monitored = sum(1 for e in events if e.decision == "MONITOR")
        blocked = sum(1 for e in events if e.decision == "BLOCK")

        # Top offending IPs
        ip_counts: Dict[str, int] = {}
        rule_counts: Dict[str, int] = {}
        for e in events:
            if e.decision in {"MONITOR", "BLOCK"}:
                ip_counts[e.client_ip] = ip_counts.get(e.client_ip, 0) + 1
            if e.findings_json:
                try:
                    for f in json.loads(e.findings_json):
                        r_id = f.get("rule_id", "Unknown")
                        rule_counts[r_id] = rule_counts.get(r_id, 0) + 1
                except Exception:
                    pass

        summary_data = {
            "time_window_start": cutoff.isoformat(),
            "time_window_end": now.isoformat(),
            "top_source_ips": sorted(ip_counts.items(), key=lambda x: x[1], reverse=True)[:5],
            "top_triggered_rules": sorted(rule_counts.items(), key=lambda x: x[1], reverse=True)[:5],
        }

        report_model = ReportModel(
            title=title,
            generated_at=now,
            time_range=f"Last {time_range_hours} hours",
            total_inspected=total,
            total_allowed=allowed,
            total_monitored=monitored,
            total_blocked=blocked,
            summary_json=json.dumps(summary_data),
        )
        session.add(report_model)
        await session.commit()
        await session.refresh(report_model)

        return ReportOut(
            id=report_model.id,
            title=report_model.title,
            generated_at=report_model.generated_at,
            time_range=report_model.time_range,
            total_inspected=report_model.total_inspected,
            total_allowed=report_model.total_allowed,
            total_monitored=report_model.total_monitored,
            total_blocked=report_model.total_blocked,
            summary=summary_data,
        )

    async def list_reports(self, session: AsyncSession) -> List[ReportOut]:
        stmt = select(ReportModel).order_by(desc(ReportModel.generated_at)).limit(50)
        res = await session.execute(stmt)
        reports = res.scalars().all()

        return [
            ReportOut(
                id=r.id,
                title=r.title,
                generated_at=r.generated_at,
                time_range=r.time_range,
                total_inspected=r.total_inspected,
                total_allowed=r.total_allowed,
                total_monitored=r.total_monitored,
                total_blocked=r.total_blocked,
                summary=json.loads(r.summary_json),
            )
            for r in reports
        ]

    @staticmethod
    def _sanitize_csv_cell(val: Any) -> Any:
        """Sanitizes cells against CSV Formula Injection (CWE-1236)."""
        if isinstance(val, str):
            stripped = val.lstrip("/")
            if val.startswith(("=", "+", "-", "@", "\t", "\r")) or (val.startswith("/") and stripped.startswith(("=", "+", "-", "@"))):
                return f"'{val}"
        return val


    async def export_events_csv(self, session: AsyncSession, limit: int = 500) -> str:
        """Exports sanitized security events in CSV format with Formula Injection protection."""
        stmt = (
            select(SecurityEventModel)
            .order_by(desc(SecurityEventModel.timestamp))
            .limit(limit)
        )
        res = await session.execute(stmt)
        events = res.scalars().all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Event ID",
            "Timestamp",
            "Client IP",
            "Method",
            "Path",
            "Decision",
            "Risk Score",
            "Findings Count",
            "Processing Time (ms)",
        ])

        for e in events:
            writer.writerow([
                self._sanitize_csv_cell(e.request_id),
                self._sanitize_csv_cell(e.timestamp.isoformat() if e.timestamp else ""),
                self._sanitize_csv_cell(e.client_ip),
                self._sanitize_csv_cell(e.method),
                self._sanitize_csv_cell(e.path),
                self._sanitize_csv_cell(e.decision),
                e.risk_score,
                e.findings_count,
                e.processing_time_ms,
            ])

        return output.getvalue()



report_service = ReportService()
