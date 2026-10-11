"""
FANOS AI — Flow-Based Telemetry & ML Pipeline Test Suite
=========================================================
Automated tests covering:
1. Collector parsing and event routing (alerts vs flows vs unsupported).
2. Genuine flow feature extraction (duration, packet counters, TCP flags).
3. 70-feature contract validation (exact dimensions, no NaN/Inf).
4. Predictor inference on flow vectors with schema versioning.
5. Ingestion API endpoints for both alerts and flows.
"""
from datetime import datetime, timezone
import json
import numpy as np
import pytest

from suricata_lab.collector.app.parser import parse_line, as_payload, as_flow_payload
from suricata_lab.collector.app.models import SuricataEvent, SuricataFlowEvent
from app.ai.feature_extractor import (
    feature_extractor,
    validate_feature_vector,
    NUM_FEATURES,
    SCHEMA_VERSION_SURICATA_FLOW,
    SCHEMA_VERSION_SURICATA_ALERT_LEGACY,
)
from app.ai.model_loader import model_loader, NUM_CLASSES
from app.ai.predictor import fanos_predictor


# ─────────────────────────────────────────────────────────────────────────────
# 1. Collector Telemetry & Parser Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_collector_parses_alert_event():
    alert_line = json.dumps({
        "timestamp": "2026-10-11T10:00:00.000000+0000",
        "event_type": "alert",
        "src_ip": "192.168.56.101",
        "src_port": 45123,
        "dest_ip": "192.168.56.1",
        "dest_port": 80,
        "proto": "TCP",
        "alert": {
            "action": "allowed",
            "signature_id": 9999020,
            "signature": "FANOS AI - TCP SYN Flood DoS Attack Detected",
            "category": "Denial of Service",
            "severity": 1,
        }
    })
    ev = parse_line(alert_line)
    assert isinstance(ev, SuricataEvent)
    assert ev.event_type == "alert"
    assert ev.source_ip == "192.168.56.101"
    assert ev.signature_id == 9999020
    assert ev.severity == 1

    payload = as_payload(ev)
    assert payload["event_type"] == "alert"
    assert payload["signature_id"] == 9999020


def test_collector_parses_flow_event():
    flow_line = json.dumps({
        "timestamp": "2026-10-11T10:05:00.000000+0000",
        "flow_id": 987654321,
        "event_type": "flow",
        "src_ip": "192.168.56.101",
        "src_port": 50220,
        "dest_ip": "192.168.56.1",
        "dest_port": 443,
        "proto": "TCP",
        "app_proto": "tls",
        "community_id": "1:abc123community",
        "flow": {
            "pkts_toserver": 25,
            "pkts_toclient": 30,
            "bytes_toserver": 3200,
            "bytes_toclient": 18500,
            "start": "2026-10-11T10:05:00.000000+0000",
            "end": "2026-10-11T10:05:01.250000+0000",
            "age": 1,
            "state": "closed",
            "alerted": False,
        },
        "tcp": {
            "syn": True,
            "fin": True,
            "ack": True,
            "psh": True,
            "rst": False,
        }
    })
    ev = parse_line(flow_line)
    assert isinstance(ev, SuricataFlowEvent)
    assert ev.event_type == "flow"
    assert ev.flow_id == 987654321
    assert ev.destination_port == 443
    assert ev.flow["pkts_toserver"] == 25
    assert ev.tcp["syn"] is True

    payload = as_flow_payload(ev)
    assert payload["event_type"] == "flow"
    assert payload["flow_id"] == 987654321
    assert payload["flow"]["bytes_toclient"] == 18500


def test_collector_safely_ignores_unsupported_event_types():
    stats_line = json.dumps({"event_type": "stats", "stats": {"uptime": 3600}})
    dns_line = json.dumps({"event_type": "dns", "dns": {"type": "query", "rrname": "example.com"}})
    http_line = json.dumps({"event_type": "http", "http": {"hostname": "fanos.local"}})

    assert parse_line(stats_line) is None
    assert parse_line(dns_line) is None
    assert parse_line(http_line) is None


def test_collector_handles_malformed_json_gracefully():
    malformed_line = '{"timestamp": "2026-10-11", "event_type": "alert", UNCLOSED'
    assert parse_line(malformed_line) is None
    assert parse_line("") is None


# ─────────────────────────────────────────────────────────────────────────────
# 2. Genuine Flow Feature Extraction Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_feature_extractor_from_suricata_flow_measures_genuine_values():
    flow_event = {
        "destination_port": 80,
        "protocol": "TCP",
        "flow": {
            "pkts_toserver": 100,
            "pkts_toclient": 50,
            "bytes_toserver": 15000,
            "bytes_toclient": 50000,
            "start": "2026-10-11T10:00:00.000000+0000",
            "end": "2026-10-11T10:00:02.000000+0000",  # 2.0 seconds = 2,000,000 µs
            "age": 2,
        },
        "tcp": {
            "syn": True,
            "fin": False,
            "rst": True,
            "ack": True,
            "psh": True,
        }
    }

    vec, schema = feature_extractor.extract_from_suricata_flow(flow_event)

    # 1. Schema check
    assert schema == SCHEMA_VERSION_SURICATA_FLOW
    assert vec.shape == (70,)
    assert vec.dtype == np.float32

    # 2. Destination Port (index 0)
    assert vec[0] == 80.0

    # 3. Flow Duration (index 1) - must equal 2,000,000 µs (not the old fake 200,000 µs!)
    assert vec[1] == 2000000.0

    # 4. Total Fwd Packets (index 2) - must equal 100 (not the old 5 - severity formula!)
    assert vec[2] == 100.0

    # 5. Total Bwd Packets (index 3) - must equal 50
    assert vec[3] == 50.0

    # 6. Total Length Fwd/Bwd Packets (indices 4, 5)
    assert vec[4] == 15000.0
    assert vec[5] == 50000.0

    # 7. Flow Rates (indices 14, 15)
    # Total bytes = 65,000 / 2.0 s = 32,500 bytes/s
    assert abs(vec[14] - 32500.0) < 1.0
    # Total packets = 150 / 2.0 s = 75 packets/s
    assert abs(vec[15] - 75.0) < 1.0

    # 8. TCP Flags (indices 41-45: FIN, SYN, RST, PSH, ACK)
    assert vec[41] == 0.0  # fin is False
    assert vec[42] == 1.0  # syn is True
    assert vec[43] == 1.0  # rst is True
    assert vec[44] == 1.0  # psh is True
    assert vec[45] == 1.0  # ack is True

    # 9. Down/Up Ratio (index 49) = 50 / 100 = 0.5
    assert abs(vec[49] - 0.5) < 1e-4


def test_feature_extractor_validates_vector_safety():
    good_vec = np.zeros(NUM_FEATURES, dtype=np.float32)
    validated = validate_feature_vector(good_vec)
    assert validated.shape == (70,)

    # Must reject invalid feature lengths
    with pytest.raises(ValueError, match="Feature count mismatch"):
        validate_feature_vector(np.zeros(69, dtype=np.float32))

    with pytest.raises(ValueError, match="Feature count mismatch"):
        validate_feature_vector(np.zeros(71, dtype=np.float32))

    # Must reject NaNs and Infs
    nan_vec = np.zeros(NUM_FEATURES, dtype=np.float32)
    nan_vec[10] = np.nan
    with pytest.raises(ValueError, match="NaN"):
        validate_feature_vector(nan_vec)

    inf_vec = np.zeros(NUM_FEATURES, dtype=np.float32)
    inf_vec[10] = np.inf
    with pytest.raises(ValueError, match="infinite"):
        validate_feature_vector(inf_vec)


def test_legacy_alert_extraction_backward_compatibility():
    alert_event = {
        "destination_port": 80,
        "protocol": "TCP",
        "severity": 2,
        "signature": "Test Signature",
    }
    vec = feature_extractor.extract(alert_event)
    assert vec.shape == (70,)
    assert not np.isnan(vec).any()


# ─────────────────────────────────────────────────────────────────────────────
# 3. Model & Predictor Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_model_loads_and_executes_on_flow_features():
    assert model_loader.is_ready()

    flow_event = {
        "destination_port": 80,
        "protocol": "TCP",
        "flow": {
            "pkts_toserver": 1500,
            "pkts_toclient": 10,
            "bytes_toserver": 90000,
            "bytes_toclient": 600,
            "start": "2026-10-11T10:00:00.000000+0000",
            "end": "2026-10-11T10:00:01.000000+0000",
            "age": 1,
        },
        "tcp": {
            "syn": True,
            "fin": False,
            "rst": False,
            "ack": False,
            "psh": False,
        }
    }

    prediction = fanos_predictor.predict_flow(flow_event, source_ip="192.168.56.101")
    assert prediction.model_status == "loaded"
    assert prediction.feature_schema == SCHEMA_VERSION_SURICATA_FLOW
    assert 0 <= prediction.predicted_class_id < NUM_CLASSES
    assert isinstance(prediction.confidence, float)
    assert len(prediction.probabilities) == NUM_CLASSES
    assert prediction.inference_ms >= 0.0
