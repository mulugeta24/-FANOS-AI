from fastapi import APIRouter
from app.api.v1 import (
    dashboard,
    events,
    incidents,
    ai_routes,
    prevention,
    web_security,
    infrastructure,
    auth,
    sms,
    suricata_events,
    threat_detection,
    scanner,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(events.router)
api_router.include_router(incidents.router)
api_router.include_router(ai_routes.router)
api_router.include_router(prevention.router)
api_router.include_router(web_security.router)
api_router.include_router(threat_detection.router)
api_router.include_router(scanner.router)
api_router.include_router(infrastructure.router)
api_router.include_router(sms.router)
api_router.include_router(suricata_events.router)
