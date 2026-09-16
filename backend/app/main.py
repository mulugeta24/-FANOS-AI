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


@app.get("/health", tags=["Health"])
async def health():
    return {
        "status":  "healthy",
        "service": "FANOS AI Backend",
        "version": settings.APP_VERSION,
        "ai_engine": "active",
    }
