import hashlib
import json
from datetime import datetime, timezone
from typing import Any

from .models import SuricataEvent
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


def parse_line(line: str) -> SuricataEvent | None:
    try:
        raw: dict[str, Any] = json.loads(line)
    except json.JSONDecodeError:
        return None
    if raw.get("event_type") != "alert":
        return None

    alert = raw.get("alert") or {}
    event_id = hashlib.sha256(line.strip().encode("utf-8")).hexdigest()
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
