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
    sensors,
    threat_detection,
    scanner,
    waf_events,
    assets,
    customer,
    admin_requests,
)
from app.waf.api.v1 import api_router as waf_api_router

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(admin_requests.router)
api_router.include_router(customer.router)
api_router.include_router(assets.router)
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
api_router.include_router(sensors.router)
api_router.include_router(waf_api_router, prefix="/waf")
api_router.include_router(waf_events.router)

