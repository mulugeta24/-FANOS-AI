"""Suricata EVE JSON ingestion and query endpoints."""
import json
import logging
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional
import redis.asyncio as aioredis

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import AliasChoices, BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.risk_engine import RiskContext, risk_engine
from app.ai.rule_engine import rule_engine
from app.core.auth import Principal, get_current_principal
from app.db.base import get_async_session
from app.models.security import SecurityEvent
# Asset and Organization models not yet implemented
# from app.models.security import Asset, Organization
from app.schemas.security import SecurityEventOut
from app.core.config import get_settings

router = APIRouter(prefix="/suricata", tags=["Suricata"])
logger = logging.getLogger("fanos.api.suricata")
settings = get_settings()

_redis_pool = None

def get_redis():
    global _redis_pool
    if _redis_pool is None:
        try:
            if not settings.REDIS_URL or settings.REDIS_URL.strip() == "":
                logger.warning("Redis URL not configured, Redis features disabled")
                return None
            _redis_pool = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        except Exception as e:
            logger.warning(f"Redis connection failed, deduplication disabled: {e}")
            return None
    return _redis_pool


class SuricataEventIngestion(BaseModel):
    """Normalized event emitted by the FANOS Suricata collector."""
    event_id: str = Field(..., min_length=1, max_length=256)
    timestamp: datetime
    event_type: str = "alert"
    source_ip: str = Field(default="unknown", validation_alias=AliasChoices("source_ip", "src_ip"))
    source_port: Optional[int] = Field(default=None, validation_alias=AliasChoices("source_port", "src_port"))
    destination_ip: str = Field(default="unknown", validation_alias=AliasChoices("destination_ip", "dest_ip"))
    destination_port: Optional[int] = Field(default=None, validation_alias=AliasChoices("destination_port", "dest_port"))
    protocol: str = Field(default="unknown", validation_alias=AliasChoices("protocol", "proto"))
    signature_id: Optional[int] = None
    signature: str = "Suricata event"
    category: str = "Network Detection"
    severity: int = Field(default=3, ge=1, le=4)
    action: str = "ALERT"
    sensor_id: Optional[str] = None
    raw_event: dict[str, Any] = Field(default_factory=dict)


class SuricataStats(BaseModel):
    total_events: int
    alerts: int
    critical: int
    high: int
    medium: int
    low: int


class CorrelationContext(BaseModel):
    correlated: bool
    prior_event_count: int
    distinct_signature_count: int


def _severity(value: int) -> str:
    return {1: "CRITICAL", 2: "HIGH", 3: "MEDIUM", 4: "LOW"}.get(value, "LOW")


def _parse_timestamp(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _attack_type(event: SuricataEventIngestion) -> str:
    text = f"{event.signature} {event.category}".lower()
    if any(term in text for term in ("scan", "recon")):
        return "Network Reconnaissance"
    if any(term in text for term in ("dos", "ddos", "flood")):
        return "Denial of Service"
    if any(term in text for term in ("malware", "trojan", "c2", "command and control")):
        return "Malware / Command and Control"
    if any(term in text for term in ("exploit", "attack")):
        return "Network Exploit"
    return "Network Detection"


def _build_correlation_key(event: SuricataEventIngestion) -> str:
    """Build deterministic correlation key from stable network attributes."""
    # Normalize IP addresses and ports consistently
    src_ip = event.source_ip.lower() if event.source_ip else "unknown"
    dst_ip = event.destination_ip.lower() if event.destination_ip else "unknown"
    dst_port = event.destination_port if event.destination_port is not None else 0
    protocol = event.protocol.lower() if event.protocol else "unknown"
    
    # Format: suricata:correlation:<source_ip>:<destination_ip>:<destination_port>:<protocol>
    return f"suricata:correlation:{src_ip}:{dst_ip}:{dst_port}:{protocol}"


async def _get_correlation_context(
    event: SuricataEventIngestion,
    redis_client
) -> CorrelationContext:
    """
    Retrieve and update correlation context for a Suricata event.
    Uses atomic Redis operations to handle multi-worker scenarios safely.
    """
    correlation_key = _build_correlation_key(event)
    
    # Compact event data for correlation state
    event_data = json.dumps({
        "event_id": event.event_id,
        "timestamp": event.timestamp.isoformat(),
        "signature_id": event.signature_id,
        "signature": event.signature,
        "source_ip": event.source_ip,
        "destination_ip": event.destination_ip,
        "destination_port": event.destination_port,
        "protocol": event.protocol,
    })
    
    try:
        # Use Redis pipeline for atomic operations
        async with redis_client.pipeline() as pipe:
            # Get current list content BEFORE adding new event
            await pipe.lrange(correlation_key, 0, -1)
            # Add new event to front of list
            await pipe.lpush(correlation_key, event_data)
            # Trim to max size (keep most recent events)
            await pipe.ltrim(correlation_key, 0, settings.FANOS_SURICATA_CORRELATION_MAX_EVENTS - 1)
            # Refresh TTL
            await pipe.expire(correlation_key, settings.FANOS_SURICATA_CORRELATION_WINDOW_SECONDS)
            
            results = await pipe.execute()
            
            prior_events = results[0]  # Events before this one (empty for first event)
            
            # Count distinct signatures from prior events
            prior_signatures = set()
            for event_json in prior_events:
                try:
                    event_obj = json.loads(event_json)
                    sig = event_obj.get("signature") or event_obj.get("signature_id")
                    if sig:
                        prior_signatures.add(str(sig))
                except (json.JSONDecodeError, KeyError):
                    continue
            
            # Add current signature to get total distinct count
            current_sig = str(event.signature_id) if event.signature_id else event.signature
            all_signatures = prior_signatures.copy()
            all_signatures.add(current_sig)
            
            correlated = len(prior_events) > 0
            prior_event_count = len(prior_events)
            distinct_signature_count = len(all_signatures)
            
            if correlated:
                logger.info(f"[CORRELATION] Existing group updated - Key: {correlation_key}, Prior events: {prior_event_count}, Distinct signatures: {distinct_signature_count}")
            else:
                logger.info(f"[CORRELATION] New group created - Key: {correlation_key}")
            
            return CorrelationContext(
                correlated=correlated,
                prior_event_count=prior_event_count,
                distinct_signature_count=distinct_signature_count
            )
            
    except Exception as e:
        logger.warning(f"[CORRELATION] Redis correlation failed, continuing without correlation context: {e}")
        # Fail open - return empty correlation context
        return CorrelationContext(
            correlated=False,
            prior_event_count=0,
            distinct_signature_count=1
        )


async def _persist_event(event: SuricataEventIngestion, session: AsyncSession) -> SecurityEvent:
    from app.ai.predictor import fanos_predictor

    # ── 1. Rule engine ────────────────────────────────────────────────
    rule_match = rule_engine.evaluate(f"{event.signature} {event.category}")

    # ── 2. Build event dict for feature extraction ─────────────────────
    event_dict = {
        "destination_port": event.destination_port,
        "source_port":      event.source_port,
        "protocol":         event.protocol,
        "severity":         event.severity,
        "signature":        event.signature,
        "category":         event.category,
        "event_type":       event.event_type,
    }

    # ── 3. ML prediction via FANOS XGBoost ────────────────────────────
    target_path = event.signature or "/"
    ml = fanos_predictor.predict_event(
        event=event_dict,
        source_ip=event.source_ip,
        target_path=target_path,
        rule_match=rule_match,
    )
    logger.info(
        "[ML][Suricata] event_id=%s | label=%s | confidence=%.2f%% | risk=%d | inference_ms=%.2f",
        event.event_id, ml.prediction, ml.confidence, ml.risk_score, ml.inference_ms,
    )

    # ── 4. Resolve severity: prefer ML risk level, fallback to Suricata severity ──
    # Use ML risk level when model is loaded; otherwise fall back to Suricata-derived severity
    if ml.model_status == "loaded":
        severity = ml.risk_level
        attack_type = ml.attack_type if ml.is_malicious else _attack_type(event)
        ai_confidence = ml.confidence * 100.0 if ml.confidence <= 1.0 else ml.confidence
        risk_score = ml.risk_score
    else:
        # Graceful degradation: rule engine + heuristic risk
        severity = _severity(event.severity)
        attack_type = _attack_type(event)
        ai_confidence = max(25.0, 100.0 - event.severity * 15.0)
        risk_score = risk_engine.compute(RiskContext(
            ai_confidence=ai_confidence,
            ai_attack_type=attack_type,
            rule_match=rule_match,
            source_ip=event.source_ip,
            target_path=event.signature,
            method=event.protocol,
            is_authenticated=False,
            asset_criticality=5,
        ))

    # ── 5. Build target string ─────────────────────────────────────────
    target = event.destination_ip
    if event.destination_port is not None:
        target = f"{target}:{event.destination_port}"

    # ── 6. Persist ────────────────────────────────────────────────────
    record = SecurityEvent(
        severity=severity,
        attack_type=attack_type,
        source_ip=event.source_ip,
        target=target,
        ai_confidence=round(ai_confidence, 2),
        risk_score=risk_score,
        status="BLOCKED" if event.action.upper() in {"DROP", "BLOCK"} else "ALERT",
        raw_payload=json.dumps(event.raw_event or event.model_dump(mode="json")),
        sensor_source="suricata",
        created_at=_parse_timestamp(event.timestamp),
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record


@router.post("/events", status_code=status.HTTP_202_ACCEPTED)
async def ingest_suricata_event(
    event: SuricataEventIngestion,
    x_fanos_suricata_token: Optional[str] = Header(default=None),
    session: AsyncSession = Depends(get_async_session),
):
    if settings.SURICATA_INGEST_TOKEN and x_fanos_suricata_token != settings.SURICATA_INGEST_TOKEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid collector token")
    
    fingerprint_input = (
        f"suricata|{event.source_ip}|{event.source_port or 0}|"
        f"{event.destination_ip}|{event.destination_port or 0}|"
        f"{event.protocol}|{event.signature_id or 0}|"
        f"{event.signature}|{event.category}"
    )
    fingerprint = hashlib.sha256(fingerprint_input.encode('utf-8')).hexdigest()[:16]
    redis_key = f"dedup:suricata:{fingerprint}"
    
    is_duplicate = False
    try:
        redis_client = get_redis()
        if redis_client:
            # Atomic set if not exists, with expiration
            if await redis_client.set(redis_key, "1", ex=settings.FANOS_DEDUP_WINDOW_SECONDS, nx=True):
                is_duplicate = False
            else:
                is_duplicate = True
        else:
            # Redis not available, skip deduplication (treat as new event)
            logger.warning("Redis not available, skipping deduplication")
            is_duplicate = False
    except Exception as e:
        logger.warning(f"Redis deduplication failed, failing open: {e}")
        # Fail open (treat as new event)
        is_duplicate = False
    
    if is_duplicate:
        logger.info(f"[DEDUP]\nDuplicate event suppressed\nFingerprint: {fingerprint}")
        return {
            "success": True,
            "message": "Duplicate Suricata event ignored",
            "event_id": "duplicate",
            "duplicate": True
        }

    logger.info(f"[DEDUP]\nNew event accepted\nFingerprint: {fingerprint}")
    
    # Stage 6B: Correlation (only after successful deduplication)
    correlation_context = CorrelationContext(correlated=False, prior_event_count=0, distinct_signature_count=1)
    try:
        redis_client = get_redis()
        if redis_client:
            correlation_context = await _get_correlation_context(event, redis_client)
        else:
            logger.warning("[CORRELATION] Redis unavailable — continuing without correlation context")
    except Exception as e:
        logger.warning(f"[CORRELATION] Correlation processing failed, continuing without correlation context: {e}")
    
    try:
        record = await _persist_event(event, session)
        logger.info(f"[PERSIST] Suricata event stored successfully - Event ID: {record.id}")
        return {
            "success": True,
            "message": "Suricata event accepted",
            "event_id": str(record.id),
            "duplicate": False,
            "correlation": correlation_context.model_dump()
        }
    except Exception as exc:
        await session.rollback()
        logger.exception("Failed to persist Suricata event %s", event.event_id)
        raise HTTPException(status_code=500, detail=f"Failed to process Suricata event: {exc}") from exc


@router.get("/events", response_model=List[SecurityEventOut])
async def get_suricata_events(
    limit: int = Query(default=50, ge=1, le=500),
    hours: int = Query(default=24, ge=1, le=168),
    severity: Optional[str] = Query(default=None),
    principal: Principal = Depends(get_current_principal),
    session: AsyncSession = Depends(get_async_session),
):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    query = (
        select(SecurityEvent)
        .where(SecurityEvent.sensor_source == "suricata")
        .where(SecurityEvent.created_at >= cutoff)
        .order_by(SecurityEvent.created_at.desc())
        .limit(limit)
    )
    if principal.role != "admin":
        if not principal.organization:
            raise HTTPException(status_code=403, detail="Your account is not assigned to an organization")
        # Organization filtering disabled - models not yet implemented
        # query = query.where(
        #     SecurityEvent.organization_id.in_(
        #         select(Organization.id).where(
        #             (func.lower(Organization.slug) == principal.organization.lower())
        #             | (func.lower(Organization.name) == principal.organization.lower())
        #         )
        #     )
        # )
    if severity:
        query = query.where(SecurityEvent.severity == severity.upper())
    result = await session.execute(query)
    return list(result.scalars().all())


@router.get("/stats", response_model=SuricataStats)
async def get_suricata_stats(
    hours: int = Query(default=24, ge=1, le=168),
    principal: Principal = Depends(get_current_principal),
    session: AsyncSession = Depends(get_async_session),
):
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    base = select(func.count(SecurityEvent.id)).where(
        SecurityEvent.sensor_source == "suricata",
        SecurityEvent.created_at >= cutoff,
    )
    if principal.role != "admin":
        if not principal.organization:
            raise HTTPException(status_code=403, detail="Your account is not assigned to an organization")
        # Organization filtering disabled - models not yet implemented
        # base = base.where(
        #     SecurityEvent.organization_id.in_(
        #         select(Organization.id).where(
        #             (func.lower(Organization.slug) == principal.organization.lower())
        #             | (func.lower(Organization.name) == principal.organization.lower())
        #         )
        #     )
        # )
    total = (await session.execute(base)).scalar() or 0
    counts: dict[str, int] = {}
    for level in ("CRITICAL", "HIGH", "MEDIUM", "LOW"):
        query = base.where(SecurityEvent.severity == level)
        counts[level] = (await session.execute(query)).scalar() or 0
    alerts = (await session.execute(base.where(SecurityEvent.status == "ALERT"))).scalar() or 0
    return SuricataStats(
        total_events=total,
        alerts=alerts,
        critical=counts["CRITICAL"],
        high=counts["HIGH"],
        medium=counts["MEDIUM"],
        low=counts["LOW"],
    )
