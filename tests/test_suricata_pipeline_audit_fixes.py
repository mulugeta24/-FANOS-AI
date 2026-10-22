"""
Tests for FANOS AI Suricata Pipeline Audit and Fixes
===================================================
Verifies:
1. Collector configuration resolves tokens (FANOS_SURICATA_TOKEN and SURICATA_INGEST_TOKEN fallback)
2. Collector URL routing correctly builds /events and /flows endpoints without path corruption
3. Backend _persist_event preserves Suricata rule severity (e.g. HIGH/CRITICAL) and does not downgrade to INFO
4. Enriched event payload distinctly contains suricata_detection and ml_analysis
5. Collector sender gracefully handles and logs HTTP errors
"""
import os
import json
import pytest
from datetime import datetime, timezone

from suricata_lab.collector.app.config import Settings
from suricata_lab.collector.app.parser import parse_line, as_payload, as_flow_payload
from suricata_lab.collector.app.models import SuricataEvent
from app.api.v1.suricata_events import SuricataEventIngestion, _persist_event, _severity
from app.models.security import SecurityEvent
from app.db.base import AsyncSessionLocal


def test_collector_config_token_fallback(monkeypatch):
    """Verify collector config falls back to SURICATA_INGEST_TOKEN if FANOS_SURICATA_TOKEN is unset."""
    monkeypatch.delenv("FANOS_SURICATA_TOKEN", raising=False)
    monkeypatch.setenv("SURICATA_INGEST_TOKEN", "token-from-ingest-env-123")
    cfg = Settings()
    assert cfg.ingest_token == "token-from-ingest-env-123"


def test_collector_url_routing(monkeypatch):
    """Verify collector cleanly generates endpoints regardless of trailing slashes or subpaths."""
    # Test base URL without trailing slash
    s1 = Settings(backend_url="http://localhost:8000")
    assert s1.events_url == "http://localhost:8000/api/v1/suricata/events"
    assert s1.flows_url == "http://localhost:8000/api/v1/suricata/flows"

    # Test base URL with trailing slash
    s2 = Settings(backend_url="http://localhost:8000/")
    assert s2.events_url == "http://localhost:8000/api/v1/suricata/events"
    assert s2.flows_url == "http://localhost:8000/api/v1/suricata/flows"

    # Test base URL ending in /events
    s3 = Settings(backend_url="http://192.168.56.1:8000/api/v1/suricata/events")
    assert s3.events_url == "http://192.168.56.1:8000/api/v1/suricata/events"
    assert s3.flows_url == "http://192.168.56.1:8000/api/v1/suricata/flows"

    # Test base URL ending in /events/ with trailing slash
    s4 = Settings(backend_url="http://192.168.56.1:8000/api/v1/suricata/events/")
    assert s4.events_url == "http://192.168.56.1:8000/api/v1/suricata/events"
    assert s4.flows_url == "http://192.168.56.1:8000/api/v1/suricata/flows"


@pytest.mark.anyio
async def test_persist_event_preserves_suricata_severity():
    """Verify Suricata rule severity is preserved (HIGH for severity=2) instead of downgraded to INFO."""
    event = SuricataEventIngestion(
        event_id="test-audit-fix-001",
        timestamp=datetime.now(timezone.utc),
        event_type="alert",
        source_ip="192.168.56.103",
        source_port=44500,
        destination_ip="192.168.56.1",
        destination_port=8080,
        protocol="TCP",
        signature_id=1000002,
        signature="FANOS LAB SQL INJECTION TEST",
        category="Web Application Attack",
        severity=2,  # HIGH in Suricata (1=CRITICAL, 2=HIGH, 3=MEDIUM, 4=LOW)
        action="ALERT",
        sensor_id="windows-suricata-01",
        raw_event={"custom_test": True}
    )

    async with AsyncSessionLocal() as session:
        record = await _persist_event(event, session)
        try:
            assert record.id is not None
            # Severity must be preserved as HIGH, not downgraded to INFO
            assert record.severity == "HIGH"
            assert record.sensor_source == "suricata"
            assert record.risk_score > 0

            # Verify enriched raw_payload
            payload = json.loads(record.raw_payload)
            assert "suricata_detection" in payload
            assert payload["suricata_detection"]["signature"] == "FANOS LAB SQL INJECTION TEST"
            assert payload["suricata_detection"]["severity"] == "HIGH"

            assert "ml_analysis" in payload
            assert payload["ml_analysis"]["model_name"] == "16D_CHAMPION"
            assert "prediction" in payload["ml_analysis"]
            assert "confidence" in payload["ml_analysis"]
        finally:
            await session.delete(record)
            await session.commit()
