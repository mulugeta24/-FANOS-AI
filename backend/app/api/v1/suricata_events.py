"""Suricata EVE JSON ingestion and query endpoints."""
import json
import logging
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional, Literal
import redis.asyncio as aioredis

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import AliasChoices, BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.risk_engine import RiskContext, risk_engine
from app.ai.rule_engine import rule_engine
from app.core.auth import Principal, get_current_principal
from app.db.base import get_async_session
from app.models.security import SecurityEvent, SensorLifecycle, SensorCommand, SensorAuditLog
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


class SuricataFlowMetrics(BaseModel):
    pkts_toserver: int = Field(default=0, ge=0)
    pkts_toclient: int = Field(default=0, ge=0)
    bytes_toserver: int = Field(default=0, ge=0)
    bytes_toclient: int = Field(default=0, ge=0)
    start: Optional[Any] = None
    end: Optional[Any] = None
    age: Optional[int] = 0
    state: Optional[str] = "unknown"
    reason: Optional[str] = None
    alerted: Optional[bool] = False


class SuricataTcpFlags(BaseModel):
    tcp_flags: Optional[str] = None
    syn: Optional[bool] = False
    fin: Optional[bool] = False
    ack: Optional[bool] = False
    psh: Optional[bool] = False
    rst: Optional[bool] = False
    urg: Optional[bool] = False
    ece: Optional[bool] = False
    cwr: Optional[bool] = False


class SuricataFlowIngestion(BaseModel):
    """Normalized flow telemetry record emitted by Suricata EVE 'flow' logs."""
    event_id: Optional[str] = None
    flow_id: Optional[int] = None
    timestamp: datetime
    event_type: str = "flow"
    source_ip: str = Field(default="unknown", validation_alias=AliasChoices("source_ip", "src_ip"))
    source_port: Optional[int] = Field(default=None, validation_alias=AliasChoices("source_port", "src_port"))
    destination_ip: str = Field(default="unknown", validation_alias=AliasChoices("destination_ip", "dest_ip"))
    destination_port: Optional[int] = Field(default=None, validation_alias=AliasChoices("destination_port", "dest_port"))
    protocol: str = Field(default="unknown", validation_alias=AliasChoices("protocol", "proto"))
    app_proto: Optional[str] = None
    community_id: Optional[str] = None
    flow: SuricataFlowMetrics = Field(default_factory=SuricataFlowMetrics)
    tcp: Optional[SuricataTcpFlags] = Field(default_factory=SuricataTcpFlags)
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

    # ── 4. Resolve severity: clearly distinguish Suricata rule vs ML prediction ──
    suricata_severity = _severity(event.severity)
    suricata_attack = _attack_type(event)
    _SEV_WEIGHT = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1, "INFO": 0}

    if ml.model_status == "loaded" and ml.is_malicious:
        # If ML model predicted a malicious attack, correlate and take the higher severity
        ml_sev = ml.risk_level
        if _SEV_WEIGHT.get(ml_sev, 0) >= _SEV_WEIGHT.get(suricata_severity, 0):
            severity = ml_sev
            attack_type = ml.attack_type
        else:
            severity = suricata_severity
            attack_type = suricata_attack
        ai_confidence = ml.confidence * 100.0 if ml.confidence <= 1.0 else ml.confidence
        risk_score = max(ml.risk_score, 100 - event.severity * 15)
    else:
        # Suricata signature rule alert is authoritative
        severity = suricata_severity
        attack_type = suricata_attack
        ai_confidence = ml.confidence * 100.0 if (ml.model_status == "loaded" and ml.confidence > 0) else max(25.0, 100.0 - event.severity * 15.0)
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

    # ── 6. Build enriched raw_payload preserving both Suricata rule & ML telemetry ─
    payload_dict = dict(event.raw_event) if isinstance(event.raw_event, dict) and event.raw_event else event.model_dump(mode="json")
    payload_dict["suricata_detection"] = {
        "signature": event.signature,
        "signature_id": event.signature_id,
        "category": event.category,
        "severity": suricata_severity,
        "action": event.action,
        "source_port": event.source_port,
        "destination_port": event.destination_port,
        "protocol": event.protocol,
    }
    payload_dict["ml_analysis"] = {
        "model_name": ml.model_name,
        "model_version": ml.model_version,
        "model_status": ml.model_status,
        "prediction": ml.prediction,
        "predicted_class": ml.predicted_class,
        "confidence": round(ai_confidence, 2),
        "is_malicious": ml.is_malicious,
        "risk_level": ml.risk_level,
        "risk_score": ml.risk_score,
        "inference_ms": ml.inference_ms,
    }

    # ── 7. Persist ────────────────────────────────────────────────────
    record = SecurityEvent(
        severity=severity,
        attack_type=attack_type,
        source_ip=event.source_ip,
        target=target,
        ai_confidence=round(ai_confidence, 2),
        risk_score=risk_score,
        status="BLOCKED" if event.action.upper() in {"DROP", "BLOCK"} else "ALERT",
        raw_payload=json.dumps(payload_dict),
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


async def _persist_flow_event(event: SuricataFlowIngestion, session: AsyncSession) -> tuple[SecurityEvent, Any]:
    from app.ai.predictor import fanos_predictor
    from app.ai.feature_extractor import SCHEMA_VERSION_SURICATA_FLOW

    flow_dict = event.model_dump(mode="json")
    target = event.destination_ip
    if event.destination_port is not None:
        target = f"{target}:{event.destination_port}"

    ml = fanos_predictor.predict_flow(
        flow_event=flow_dict,
        source_ip=event.source_ip,
        target_path=target,
    )

    logger.info(
        "[ML][Flow] flow_id=%s | src=%s | dst=%s | label=%s | confidence=%.2f%% | risk=%d | ms=%.2f",
        event.flow_id, event.source_ip, target, ml.prediction, ml.confidence, ml.risk_score, ml.inference_ms,
    )

    # Separation of alerts and unvalidated flow telemetry:
    # Experimental flow detection must NOT be promoted to authoritative SOC ALERT
    if ml.is_malicious and ml.confidence >= 75.0:
        severity = ml.risk_level
        attack_type = f"Experimental ML Flow: {ml.attack_type}"
        status_val = "ANALYZED_EXPERIMENTAL"
        sensor_source = "fanos-ml-flow-experimental"
    else:
        severity = "INFO"
        attack_type = "Normal Network Flow"
        status_val = "ANALYZED"
        sensor_source = "suricata-flow"

    ai_confidence = ml.confidence * 100.0 if ml.confidence <= 1.0 else ml.confidence

    meta_payload = {
        "flow_id": event.flow_id,
        "event_id": event.event_id,
        "schema_version": getattr(ml, "feature_schema", SCHEMA_VERSION_SURICATA_FLOW),
        "is_experimental": getattr(ml, "is_experimental", True),
        "validation_status": getattr(ml, "validation_status", "EXPERIMENTAL_UNVALIDATED_APPROXIMATION"),
        "missing_features_count": getattr(ml, "missing_features_count", 32),
        "compatibility_warning": getattr(ml, "compatibility_warning", None),
        "model_name": ml.model_name,
        "predicted_class": ml.predicted_class,
        "confidence": round(ai_confidence, 2),
        "risk_score": ml.risk_score,
        "pkts_toserver": event.flow.pkts_toserver,
        "pkts_toclient": event.flow.pkts_toclient,
        "bytes_toserver": event.flow.bytes_toserver,
        "bytes_toclient": event.flow.bytes_toclient,
        "app_proto": event.app_proto,
        "community_id": event.community_id,
        "raw_event": event.raw_event or flow_dict,
    }

    record = SecurityEvent(
        severity=severity,
        attack_type=attack_type,
        source_ip=event.source_ip,
        target=target,
        ai_confidence=round(ai_confidence, 2),
        risk_score=ml.risk_score,
        status=status_val,
        raw_payload=json.dumps(meta_payload),
        sensor_source=sensor_source,
        created_at=_parse_timestamp(event.timestamp),
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record, ml


@router.post("/flows", status_code=status.HTTP_202_ACCEPTED)
async def ingest_suricata_flow(
    flow: SuricataFlowIngestion,
    x_fanos_suricata_token: Optional[str] = Header(default=None),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Ingest a genuine Suricata EVE 'flow' telemetry record.
    Extracts true flow measurements and executes independent ML inference.
    """
    if settings.SURICATA_INGEST_TOKEN and x_fanos_suricata_token != settings.SURICATA_INGEST_TOKEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid collector token")

    fingerprint_input = (
        f"suricata_flow|{flow.flow_id or 0}|{flow.source_ip}|{flow.source_port or 0}|"
        f"{flow.destination_ip}|{flow.destination_port or 0}|{flow.protocol}|"
        f"{flow.flow.pkts_toserver}|{flow.flow.bytes_toserver}"
    )
    fingerprint = hashlib.sha256(fingerprint_input.encode("utf-8")).hexdigest()[:16]
    redis_key = f"dedup:suricata_flow:{fingerprint}"

    is_duplicate = False
    try:
        redis_client = get_redis()
        if redis_client:
            if not await redis_client.set(redis_key, "1", ex=settings.FANOS_DEDUP_WINDOW_SECONDS, nx=True):
                is_duplicate = True
    except Exception as e:
        logger.warning("Redis flow deduplication failed: %s", e)

    if is_duplicate:
        logger.info("[DEDUP] Duplicate Suricata flow suppressed: %s", fingerprint)
        return {
            "success": True,
            "message": "Duplicate Suricata flow ignored",
            "duplicate": True,
            "flow_id": flow.flow_id,
        }

    try:
        record, ml = await _persist_flow_event(flow, session)
        return {
            "success": True,
            "message": "Suricata flow processed and analyzed",
            "event_id": str(record.id),
            "flow_id": flow.flow_id,
            "duplicate": False,
            "ml_prediction": {
                "class_id": ml.predicted_class_id,
                "class": ml.predicted_class,
                "display": ml.prediction,
                "confidence": round(ml.confidence, 2),
                "is_malicious": ml.is_malicious,
                "risk_score": ml.risk_score,
                "risk_level": ml.risk_level,
                "feature_schema": getattr(ml, "feature_schema", "SURICATA_FLOW_DERIVED_V1"),
                "sensor_source": record.sensor_source,
            },
        }
    except Exception as exc:
        await session.rollback()
        logger.exception("Failed to process Suricata flow: %s", exc)
        raise HTTPException(status_code=500, detail=f"Failed to process Suricata flow: {exc}") from exc



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
        .where(SecurityEvent.sensor_source.in_(["suricata", "suricata-flow"]))
        .where(SecurityEvent.created_at >= cutoff)
        .order_by(SecurityEvent.created_at.desc())
        .limit(limit)
    )
    if principal.role not in ("admin", "analyst"):
        if not principal.organization:
            raise HTTPException(status_code=403, detail="Your account is not assigned to an organization")
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
        SecurityEvent.sensor_source.in_(["suricata", "suricata-flow"]),
        SecurityEvent.created_at >= cutoff,
    )
    if principal.role not in ("admin", "analyst"):
        if not principal.organization:
            raise HTTPException(status_code=403, detail="Your account is not assigned to an organization")
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
