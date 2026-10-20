"""
API v1 Router aggregation.
"""
from fastapi import APIRouter

from app.waf.api.v1.audit import router as audit_router
from app.waf.api.v1.auth import router as auth_router
from app.waf.api.v1.domains import router as domains_router
from app.waf.api.v1.events import router as events_router
from app.waf.api.v1.health import router as health_router
from app.waf.api.v1.inspect import router as inspect_router
from app.waf.api.v1.reports import router as reports_router
from app.waf.api.v1.rules import router as rules_router
from app.waf.api.v1.settings import router as settings_router
from app.waf.api.v1.stats import router as stats_router
from app.waf.proxy.reverse_proxy import router as proxy_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(domains_router)
api_router.include_router(inspect_router)
api_router.include_router(rules_router)
api_router.include_router(events_router)
api_router.include_router(stats_router)
api_router.include_router(settings_router)
api_router.include_router(reports_router)
api_router.include_router(audit_router)
api_router.include_router(proxy_router)

__all__ = ["api_router"]
