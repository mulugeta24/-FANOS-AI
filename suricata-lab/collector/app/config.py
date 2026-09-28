import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    eve_path: str = os.getenv("SURICATA_EVE_PATH", "")
    backend_url: str = os.getenv("FANOS_SURICATA_URL", "")
    ingest_token: str = os.getenv("FANOS_SURICATA_TOKEN", "")
    sensor_id: str = os.getenv("SURICATA_SENSOR_ID", "windows-suricata-01")
    state_path: str = os.getenv("SURICATA_COLLECTOR_STATE", "collector-state.json")
    poll_seconds: float = float(os.getenv("SURICATA_POLL_SECONDS", "1"))
    retry_seconds: float = float(os.getenv("SURICATA_RETRY_SECONDS", "5"))


settings = Settings()
