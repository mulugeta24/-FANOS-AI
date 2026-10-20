"""
FANOS AI — FastAPI Application Entry Point
==========================================
AI-Powered Intrusion Detection, Prevention & Response System
"""
from contextlib import asynccontextmanager

from typing import Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.logging import configure_logging, log
from app.api.v1 import api_router
from app.db.init_db import init_tables
from app.api.v1.threat_detection import (
    analyze_url,
    get_recent_scans,
    get_scan_details,
    submit_user_report,
    get_user_reports,
    get_threat_stats,
    URLAnalyzeRequest,
    UserReportRequest,
)

settings = get_settings()


from app.waf.api.v1 import api_router as waf_api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(debug=settings.DEBUG)
    log.info("FANOS AI starting", version=settings.APP_VERSION, env=settings.APP_ENV)
    await init_tables()
    try:
        from app.waf.init_db import init_waf_db
        await init_waf_db()
        log.info("FANOS WAF engine initialized and seed data verified")
    except Exception as e:
        log.warning("FANOS WAF DB initialization notice", error=str(e))
    yield
    log.info("FANOS AI shutting down")
    try:
        from app.waf.proxy.reverse_proxy import proxy_engine
        await proxy_engine.aclose()
    except Exception:
        pass


app = FastAPI(
    title="FANOS AI",
    description=(
        "## FANOS AI — Unified AI-Powered Cybersecurity Platform\n\n"
        "Unified cybersecurity platform integrating ML URL threat detection, network flow IDS, "
        "Web Application Firewall, vulnerability scanning, and real-time SOC operations.\n\n"
        "**Tech Stack:** FastAPI · XGBoost · Scikit-Learn · SQLAlchemy · PostgreSQL · Redis\n\n"
        "**Built by:** Mulugeta Ababi"
    ),
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ── Middleware ──────────────────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ─────────────────────────────────────────────────────
app.include_router(api_router, prefix=settings.API_PREFIX)
app.include_router(waf_api_router, prefix="/waf-api", tags=["WAF Direct API"])



# ── Root & Health ──────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def root():
    return JSONResponse({
        "name":    "FANOS AI",
        "version": settings.APP_VERSION,
        "status":  "online",
        "docs":    "/api/docs",
    })


from datetime import datetime, timezone
from sqlalchemy import text, select
from app.db.base import AsyncSessionLocal
from app.models.security import SecurityEvent
from app.ai.model_loader import model_loader


@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
async def health():
    db_status = "offline"
    suricata_status = "idle"
    suricata_last_seen = None
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
            db_status = "online"

            latest_evt = (await session.execute(
                select(SecurityEvent.created_at)
                .where(SecurityEvent.sensor_source == "suricata")
                .order_by(SecurityEvent.created_at.desc())
                .limit(1)
            )).scalar_one_or_none()

            if latest_evt:
                suricata_last_seen = latest_evt.isoformat()
                now = datetime.now(timezone.utc)
                if latest_evt.tzinfo is None:
                    latest_evt = latest_evt.replace(tzinfo=timezone.utc)
                if (now - latest_evt).total_seconds() < 7200:
                    suricata_status = "active"
                else:
                    suricata_status = "idle"
    except Exception as exc:
        log.warning("Health check probe failed", error=str(exc))
        db_status = "offline"

    ml_ready = model_loader.is_ready()
    ml_status = "loaded" if ml_ready else "degraded"

    overall = "healthy" if (db_status == "online" and ml_ready) else "degraded"

    return {
        "status": "healthy",
        "service": "FANOS AI Unified Platform",
        "version": settings.APP_VERSION,
        "ai_network_engine": "active" if ml_ready else "degraded",
        "ml_url_detector": "active",
        "components": {
            "backend": "online",
            "database": db_status,
            "suricata_collector": suricata_status,
            "suricata_last_seen": suricata_last_seen,
            "ml_engine": ml_status,
        },
    }


# ── Backward-Compatibility Endpoints for Legacy Clients / Bot ─
@app.post("/api/scan", tags=["Compatibility"])
async def legacy_scan(payload: URLAnalyzeRequest):
    res = await analyze_url(payload, session=None)
    return {
        "scan_id": res.scan_id,
        "url": res.url,
        "final_verdict": res.final_verdict,
        "ml_prediction": res.ml_prediction,
        "ml_confidence": res.ml_confidence,
        "ml_probs": res.ml_probabilities,
        "vt_result": res.vt_result,
        "features": res.features,
        "timestamp": res.timestamp,
    }


@app.get("/api/scans", tags=["Compatibility"])
async def legacy_scans(limit: int = 50):
    return await get_recent_scans(limit=limit, session=None)


@app.get("/api/scans/{scan_id}", tags=["Compatibility"])
async def legacy_scan_details(scan_id: int):
    return await get_scan_details(scan_id=scan_id, session=None)


@app.post("/api/report", tags=["Compatibility"])
async def legacy_report(payload: UserReportRequest):
    return await submit_user_report(payload, session=None)


@app.get("/api/reports", tags=["Compatibility"])
async def legacy_reports(limit: int = 50, search: Optional[str] = None):
    return await get_user_reports(limit=limit, search=search, session=None)


@app.get("/api/stats", tags=["Compatibility"])
@app.get("/api/public/stats", tags=["Compatibility"])
async def legacy_stats():
    return await get_threat_stats(session=None)
