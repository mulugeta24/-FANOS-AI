"""
Service for computing real-time security dashboard analytics and metrics from database records.
"""
import json
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Dict, List
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.waf.models import SecurityEventModel, WAFRuleModel
from app.waf.rules.registry import rule_registry
from app.waf.schemas.stats import (
    CategoryCount,
    HourlyActivity,
    SeverityCount,
    StatsSummary,
)

settings = get_settings()


class StatsService:
    """Calculates dashboard summary statistics from actual database records."""

    async def get_summary_stats(self, session: AsyncSession) -> StatsSummary:
        # Total counts by decision
        stmt = select(
            SecurityEventModel.decision,
            func.count(SecurityEventModel.id)
        ).group_by(SecurityEventModel.decision)
        res = await session.execute(stmt)
        decision_map = dict(res.all())

        total_allowed = decision_map.get("ALLOW", 0)
        total_monitored = decision_map.get("MONITOR", 0)
        total_blocked = decision_map.get("BLOCK", 0)
        total_inspected = total_allowed + total_monitored + total_blocked

        # Retrieve recent events for finding analysis (last 500 events)
        recent_events_stmt = (
            select(SecurityEventModel.findings_json, SecurityEventModel.timestamp, SecurityEventModel.decision)
            .order_by(SecurityEventModel.timestamp.desc())
            .limit(500)
        )
        recent_res = await session.execute(recent_events_stmt)
        recent_rows = recent_res.all()

        severity_counter = Counter()
        category_counter = Counter()
        hourly_map = defaultdict(lambda: {"inspected": 0, "blocked": 0, "monitored": 0})

        for findings_json, ts, dec in recent_rows:
            # Timeline grouping by hour (HH:00)
            if ts:
                hour_key = ts.strftime("%H:00")
                hourly_map[hour_key]["inspected"] += 1
                if dec == "BLOCK":
                    hourly_map[hour_key]["blocked"] += 1
                elif dec == "MONITOR":
                    hourly_map[hour_key]["monitored"] += 1

            if not findings_json:
                continue

            try:
                findings = json.loads(findings_json)
                for f in findings:
                    sev = f.get("severity", "").lower()
                    if sev in {"critical", "high", "medium", "low", "info"}:
                        severity_counter[sev] += 1
                    cat = f.get("category")
                    if cat:
                        category_counter[cat] += 1
            except Exception:
                pass

        # Top attack categories
        top_categories = [
            CategoryCount(category=cat, count=cnt)
            for cat, cnt in category_counter.most_common(6)
        ]

        # Sorted timeline
        now = datetime.now(timezone.utc)
        timeline: List[HourlyActivity] = []
        for i in range(12, -1, -1):
            h_time = now - timedelta(hours=i)
            h_str = h_time.strftime("%H:00")
            h_data = hourly_map.get(h_str, {"inspected": 0, "blocked": 0, "monitored": 0})
            timeline.append(
                HourlyActivity(
                    hour=h_str,
                    inspected=h_data["inspected"],
                    blocked=h_data["blocked"],
                    monitored=h_data["monitored"],
                )
            )

        active_rules = len(rule_registry.get_enabled_rules())
        custom_rules = len([r for r in rule_registry.get_all_rules() if r.is_custom])

        # Domain counts
        from app.waf.models import Domain
        dom_stmt = select(
            func.count(Domain.id),
            func.sum(case((Domain.verification_status == "verified", 1), else_=0)),
            func.sum(case((Domain.is_active == True, 1), else_=0)),
        )
        dom_res = await session.execute(dom_stmt)
        total_dom, verif_dom, act_dom = dom_res.one()

        return StatsSummary(
            total_inspected=total_inspected,
            total_allowed=total_allowed,
            total_monitored=total_monitored,
            total_blocked=total_blocked,
            active_rules_count=active_rules,
            custom_rules_count=custom_rules,
            current_mode=settings.WAF_MODE,
            total_domains=total_dom or 0,
            verified_domains=verif_dom or 0,
            active_domains=act_dom or 0,
            severity_distribution=SeverityCount(
                critical=severity_counter.get("critical", 0),
                high=severity_counter.get("high", 0),
                medium=severity_counter.get("medium", 0),
                low=severity_counter.get("low", 0),
                info=severity_counter.get("info", 0),
            ),
            top_attack_categories=top_categories,
            recent_activity_timeline=timeline,
        )


stats_service = StatsService()
