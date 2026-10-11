from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class SuricataEvent:
    event_id: str
    timestamp: datetime
    event_type: str
    source_ip: str
    source_port: int | None
    destination_ip: str
    destination_port: int | None
    protocol: str
    signature_id: int | None
    signature: str
    category: str
    severity: int
    action: str
    sensor_id: str
    raw_event: dict[str, Any]


@dataclass(frozen=True)
class SuricataFlowEvent:
    event_id: str
    timestamp: datetime
    event_type: str
    source_ip: str
    source_port: int | None
    destination_ip: str
    destination_port: int | None
    protocol: str
    app_proto: str | None
    flow_id: int | None
    community_id: str | None
    flow: dict[str, Any]
    tcp: dict[str, Any]
    sensor_id: str
    raw_event: dict[str, Any]

