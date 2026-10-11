import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from .models import SuricataEvent, SuricataFlowEvent
from .config import settings


def _timestamp(value: str | None) -> datetime:
    if not value:
        return datetime.now(timezone.utc)
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return datetime.now(timezone.utc)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _integer(value: Any) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _severity(value: Any) -> int:
    severity = _integer(value)
    return severity if severity in {1, 2, 3, 4} else 3


def parse_line(line: str) -> SuricataEvent | SuricataFlowEvent | None:
    try:
        raw: dict[str, Any] = json.loads(line)
    except json.JSONDecodeError:
        return None

    event_type = raw.get("event_type")
    if event_type not in ("alert", "flow"):
        return None

    event_id = hashlib.sha256(line.strip().encode("utf-8")).hexdigest()

    if event_type == "alert":
        alert = raw.get("alert") or {}
        return SuricataEvent(
            event_id=event_id,
            timestamp=_timestamp(raw.get("timestamp")),
            event_type="alert",
            source_ip=str(raw.get("src_ip") or "unknown"),
            source_port=_integer(raw.get("src_port")),
            destination_ip=str(raw.get("dest_ip") or "unknown"),
            destination_port=_integer(raw.get("dest_port")),
            protocol=str(raw.get("proto") or "unknown"),
            signature_id=alert.get("signature_id"),
            signature=str(alert.get("signature") or "Suricata alert"),
            category=str(alert.get("category") or "Network Detection"),
            severity=_severity(alert.get("severity")),
            action=str(alert.get("action") or "ALERT").upper(),
            sensor_id=settings.sensor_id,
            raw_event=raw,
        )

    # event_type == "flow"
    return SuricataFlowEvent(
        event_id=event_id,
        timestamp=_timestamp(raw.get("timestamp")),
        event_type="flow",
        source_ip=str(raw.get("src_ip") or "unknown"),
        source_port=_integer(raw.get("src_port")),
        destination_ip=str(raw.get("dest_ip") or "unknown"),
        destination_port=_integer(raw.get("dest_port")),
        protocol=str(raw.get("proto") or "unknown"),
        app_proto=raw.get("app_proto"),
        flow_id=_integer(raw.get("flow_id")),
        community_id=raw.get("community_id"),
        flow=raw.get("flow") or {},
        tcp=raw.get("tcp") or {},
        sensor_id=settings.sensor_id,
        raw_event=raw,
    )


def as_payload(event: SuricataEvent) -> dict[str, Any]:
    return {
        "event_id": event.event_id,
        "timestamp": event.timestamp.isoformat(),
        "event_type": event.event_type,
        "src_ip": event.source_ip,
        "src_port": event.source_port,
        "dest_ip": event.destination_ip,
        "dest_port": event.destination_port,
        "proto": event.protocol,
        "signature_id": event.signature_id,
        "signature": event.signature,
        "category": event.category,
        "severity": event.severity,
        "action": event.action,
        "sensor_id": event.sensor_id,
        "raw_event": event.raw_event,
    }


def as_flow_payload(event: SuricataFlowEvent) -> dict[str, Any]:
    return {
        "event_id": event.event_id,
        "flow_id": event.flow_id,
        "timestamp": event.timestamp.isoformat(),
        "event_type": "flow",
        "src_ip": event.source_ip,
        "src_port": event.source_port,
        "dest_ip": event.destination_ip,
        "dest_port": event.destination_port,
        "proto": event.protocol,
        "app_proto": event.app_proto,
        "community_id": event.community_id,
        "flow": event.flow,
        "tcp": event.tcp,
        "sensor_id": event.sensor_id,
        "raw_event": event.raw_event,
    }

