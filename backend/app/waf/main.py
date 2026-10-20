"""
FANOS WAF — FastAPI Application Entry Point.
==============================================
Deterministic Web Application Firewall & Threat Protection Platform.
"""
from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.waf.api.v1 import api_router
from app.core.config import get_settings
from app.core.logging import setup_logging
from app.waf.init_db import init_db

settings = get_settings()
logger = setup_logging(debug=settings.DEBUG)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes database schema and seed data on startup."""
    logger.info("Initializing FANOS WAF database...")
    await init_db()
    logger.info("FANOS WAF engine online | mode=%s | port=%s", settings.WAF_MODE, settings.PORT)
    yield
    logger.info("FANOS WAF shutting down.")
    from app.waf.proxy.reverse_proxy import proxy_engine
    await proxy_engine.aclose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "## FANOS WAF — Web Application Firewall & Threat Protection Platform\n\n"
        "Deterministic, rule-based web application firewall providing real-time HTTP request "
        "inspection, multi-vector attack detection (SQLi, XSS, Path Traversal, CMDI), "
        "explainable risk scoring, and sanitized security event logging.\n\n"
        "**Tech Stack:** FastAPI · SQLAlchemy · PostgreSQL · Pydantic"
    ),
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ── Global Middleware ───────────────────────────────────────────
app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Safe Exception Handlers ─────────────────────────────────────
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Prevents stack traces and sensitive internal errors from leaking to clients."""
    logger.error("Unhandled server exception: %s", str(exc), exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. This event has been logged."},
    )


# ── Mount Versioned API Routes ──────────────────────────────────
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# ── Root ────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs": "/docs",
        "mode": settings.WAF_MODE,
    }
