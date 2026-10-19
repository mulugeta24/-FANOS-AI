"""
Dedicated Transparent Reverse Proxy Traffic Listener for FANOS WAF.
Listens on Port 8002.
Directly intercepts incoming HTTP requests, resolves the domain from the Host header,
enforces security rules and rate limiting, and forwards allowed traffic to the domain's origin.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
import uvicorn

from app.core.config import get_settings
from app.waf.init_db import init_waf_db
from app.waf.proxy.reverse_proxy import proxy_engine

settings = get_settings()
logger = logging.getLogger("fanos_waf.listener")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting FANOS WAF Dedicated Traffic Listener on port 8002...")
    await init_waf_db()
    yield
    logger.info("Shutting down FANOS WAF Traffic Listener...")
    await proxy_engine.aclose()


proxy_app = FastAPI(
    title="FANOS WAF — Dedicated Traffic Listener",
    description="Transparent HTTP reverse proxy enforcement entry point.",
    version=settings.APP_VERSION,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)


@proxy_app.api_route("/{traffic_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
async def route_traffic(traffic_path: str, request: Request):
    """
    Transparently intercepts every request hitting port 8002, extracts Host header,
    resolves against registered domains, checks rate limits and WAF rules, and proxies to upstream.
    """
    return await proxy_engine.intercept_and_forward(request)


if __name__ == "__main__":
    uvicorn.run(
        "proxy_listener:proxy_app",
        host="0.0.0.0",
        port=8002,
        log_level="info",
        reload=settings.DEBUG,
    )
