"""
FANOS AI — FastAPI Application Entry Point
==========================================
AI-Powered Intrusion Detection, Prevention & Response System
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.logging import configure_logging, log
from app.api.v1 import api_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging(debug=settings.DEBUG)
    log.info("FANOS AI starting", version=settings.APP_VERSION, env=settings.APP_ENV)
    yield
    log.info("FANOS AI shutting down")


app = FastAPI(
    title="FANOS AI",
    description=(
        "## FANOS AI — AI-Powered Intrusion Detection, Prevention & Response System\n\n"
        "Enterprise SOC platform providing real-time threat detection using XGBoost ML, "
        "rule-based detection, risk scoring, threat correlation, and automated prevention.\n\n"
        "**Tech Stack:** FastAPI · XGBoost · SQLAlchemy · PostgreSQL · Redis\n\n"
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


# ── Root ───────────────────────────────────────────────────────
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
        "status": overall,
        "service": "FANOS AI Backend",
        "version": settings.APP_VERSION,
        "components": {
            "backend": "online",
            "database": db_status,
            "suricata_collector": suricata_status,
            "suricata_last_seen": suricata_last_seen,
            "ml_engine": ml_status,
        },
    }

