import os
from dataclasses import dataclass


@dataclass
class Settings:
    eve_path: str = ""
    backend_url: str = ""
    ingest_token: str = ""
    sensor_id: str = "windows-suricata-01"
    state_path: str = "collector-state.json"
    poll_seconds: float = 1.0
    retry_seconds: float = 5.0

    def __post_init__(self):
        if not self.eve_path:
            self.eve_path = os.getenv("SURICATA_EVE_PATH", "")
        if not self.backend_url:
            self.backend_url = os.getenv("FANOS_SURICATA_URL", os.getenv("BACKEND_URL", "http://localhost:8000"))
        if not self.ingest_token:
            self.ingest_token = os.getenv("FANOS_SURICATA_TOKEN", "") or os.getenv("SURICATA_INGEST_TOKEN", "")
        if self.sensor_id == "windows-suricata-01":
            self.sensor_id = os.getenv("SURICATA_SENSOR_ID", "windows-suricata-01")
        if self.state_path == "collector-state.json":
            self.state_path = os.getenv("SURICATA_COLLECTOR_STATE", "collector-state.json")

    @property
    def events_url(self) -> str:
        if not self.backend_url:
            return ""
        base = self.backend_url.rstrip("/")
        if base.endswith("/events"):
            return base
        if base.endswith("/flows"):
            return base[:-6] + "/events"
        if "/api/v1/suricata" in base:
            return f"{base}/events"
        return f"{base}/api/v1/suricata/events"

    @property
    def flows_url(self) -> str:
        explicit = os.getenv("FANOS_SURICATA_FLOW_URL")
        if explicit:
            return explicit
        if not self.backend_url:
            return ""
        base = self.backend_url.rstrip("/")
        if base.endswith("/flows"):
            return base
        if base.endswith("/events"):
            return base[:-7] + "/flows"
        if "/api/v1/suricata" in base:
            return f"{base}/flows"
        return f"{base}/api/v1/suricata/flows"


settings = Settings()

