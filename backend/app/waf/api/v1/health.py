"""
Health check endpoint.
"""
from datetime import datetime, timezone
from fastapi import APIRouter
from app.core.config import get_settings
from app.waf.rules.registry import rule_registry

router = APIRouter(tags=["Health"])
settings = get_settings()


@router.get("/health")
async def health_check():
    """Returns system status, active rule count, and operational mode."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.APP_VERSION,
        "mode": settings.WAF_MODE,
        "active_rules": len(rule_registry.get_enabled_rules()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
