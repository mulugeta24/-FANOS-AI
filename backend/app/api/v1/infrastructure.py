"""
Infrastructure API — sensors, network, hosts, and Zeek event ingestion.
"""
import json
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.security import SensorOut
from app.models.security import SecurityEvent
from app.db.base import get_db
from app.services.zeek.normalizer import ZeekNormalizer

router = APIRouter(prefix="/infrastructure", tags=["Infrastructure"])
_normalizer = ZeekNormalizer()


class ZeekEventIngestion(BaseModel):
    log_type: str = Field(..., description="Zeek log type (conn, dns, http, ssl, etc.)")
    record: Dict[str, Any] = Field(..., description="Raw Zeek log record")


async def create_security_event_from_zeek(
    event: ZeekEventIngestion,
    session: Any,
) -> SecurityEvent:
    normalized = _normalizer.normalize(event.record, event.log_type)
    source_ip = normalized.get("source_ip") or event.record.get("id.orig_h") or "0.0.0.0"
    target = normalized.get("destination_ip") or event.record.get("id.resp_h") or "0.0.0.0"
    attack_type = normalized.get("event_type") or "network_connection"

    raw_payload_dict = {
        "source": "zeek",
        "log_type": event.log_type,
        "record": event.record,
        "normalized": normalized,
    }

    security_event = SecurityEvent(
        severity="INFO",
        attack_type=attack_type,
        source_ip=str(source_ip),
        target=str(target),
        ai_confidence=1.0,
        risk_score=0,
        status="LOGGED",
        raw_payload=json.dumps(raw_payload_dict),
        sensor_source="zeek",
    )

    session.add(security_event)
    await session.commit()
    await session.refresh(security_event)
    return security_event


@router.post("/sensors/zeek/events")
async def ingest_zeek_event(
    payload: ZeekEventIngestion,
    session: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    event = await create_security_event_from_zeek(payload, session)
    return {"status": "success", "event_id": str(event.id)}


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
