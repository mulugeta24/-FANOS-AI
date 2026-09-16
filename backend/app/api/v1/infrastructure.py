"""
Infrastructure API — sensors, network, hosts.
"""
from typing import List

from fastapi import APIRouter

from app.schemas.security import SensorOut

router = APIRouter(prefix="/infrastructure", tags=["Infrastructure"])


@router.get("/sensors", response_model=List[SensorOut])
async def get_sensors() -> List[SensorOut]:
    return [
        SensorOut(name="Suricata",       type="Network IDS",    status="ONLINE", events=3241, uptime="99.99%"),
        SensorOut(name="Zeek",           type="Network NSM",    status="ONLINE", events=1847, uptime="99.97%"),
        SensorOut(name="WAF",            type="Web Firewall",   status="ONLINE", events=892,  uptime="100%"),
        SensorOut(name="Wazuh",          type="Host IDS",       status="ONLINE", events=2104, uptime="99.95%"),
        SensorOut(name="Network Sensor", type="Packet Capture", status="ONLINE", events=4512, uptime="99.98%"),
        SensorOut(name="FANOS AI",       type="AI Engine",      status="ONLINE", events=8421, uptime="100%"),
    ]


@router.get("/health")
async def infrastructure_health() -> dict:
    return {
        "status": "healthy",
        "sensors_online": 6,
        "sensors_total": 6,
        "system_health_pct": 98.7,
        "database": "connected",
        "redis": "connected",
        "ai_engine": "production",
    }
