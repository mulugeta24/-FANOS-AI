"""
FANOS AI — Flow Pipeline Verification Runner
============================================
Runs verification tests for genuine flow feature extraction,
schema contracts, and flow prediction.
"""
import sys
import json
import numpy as np

from app.ai.feature_extractor import (
    feature_extractor,
    validate_feature_vector,
    NUM_FEATURES,
    SCHEMA_VERSION_SURICATA_FLOW,
    SCHEMA_VERSION_SURICATA_ALERT_LEGACY,
)
from app.ai.model_loader import model_loader, NUM_CLASSES
from app.ai.predictor import fanos_predictor


def run_all_tests():
    print("=" * 70)
    print("FANOS AI — FLOW-BASED DETECTION & ML PIPELINE VERIFICATION")
    print("=" * 70)

    # TEST 1: Feature Extraction from Genuine Suricata Flow
    print("\n[TEST 1] Testing genuine flow feature extraction...")
    flow_event = {
        "destination_port": 80,
        "protocol": "TCP",
        "flow": {
            "pkts_toserver": 100,
            "pkts_toclient": 50,
            "bytes_toserver": 15000,
            "bytes_toclient": 50000,
            "start": "2026-10-11T10:00:00.000000+0000",
            "end": "2026-10-11T10:00:02.000000+0000",  # 2.0 s = 2,000,000 µs
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
    assert schema == SCHEMA_VERSION_SURICATA_FLOW, f"Schema mismatch: {schema}"
    assert vec.shape == (70,), f"Shape mismatch: {vec.shape}"
    assert vec[0] == 80.0, f"Port mismatch: {vec[0]}"
    assert vec[1] == 2000000.0, f"Duration mismatch: {vec[1]}"
    assert vec[2] == 100.0, f"Pkts fwd mismatch: {vec[2]}"
    assert vec[3] == 50.0, f"Pkts bwd mismatch: {vec[3]}"
    assert vec[4] == 15000.0, f"Bytes fwd mismatch: {vec[4]}"
    assert vec[5] == 50000.0, f"Bytes bwd mismatch: {vec[5]}"
    assert abs(vec[14] - 32500.0) < 1.0, f"Flow bytes/s mismatch: {vec[14]}"
    assert abs(vec[15] - 75.0) < 1.0, f"Flow pkts/s mismatch: {vec[15]}"
    assert vec[42] == 1.0, f"SYN flag mismatch: {vec[42]}"
    assert vec[43] == 1.0, f"RST flag mismatch: {vec[43]}"
    assert abs(vec[49] - 0.5) < 1e-4, f"Down/Up ratio mismatch: {vec[49]}"
    print("  [OK] Genuine measurements (duration, packets, bytes, rates, TCP flags) correctly extracted.")

    # TEST 2: 70-Feature Contract & Vector Validation
    print("\n[TEST 2] Testing 70-feature contract validation...")
    validated = validate_feature_vector(vec)
    assert validated.shape == (70,)
    assert not np.isnan(validated).any()
    assert not np.isinf(validated).any()
    print("  [OK] Feature vector strictly valid (no NaNs, no Infs, exact 70 dimensions).")

    # TEST 3: Legacy Alert Extraction Backward-Compatibility
    print("\n[TEST 3] Testing legacy alert extraction backward compatibility...")
    alert_event = {
        "destination_port": 443,
        "protocol": "TCP",
        "severity": 1,
        "signature": "Test Alert",
    }
    legacy_vec = feature_extractor.extract(alert_event)
    assert legacy_vec.shape == (70,)
    assert legacy_vec[0] == 443.0
    print("  [OK] Legacy alert feature extraction remains fully functional.")

    # TEST 4: ML Model Loader Status
    print("\n[TEST 4] Testing model loader readiness...")
    assert model_loader.is_ready(), "Model loader not ready!"
    print(f"  [OK] Model '{model_loader.model_name}' loaded with status: {model_loader.status}.")

    # TEST 5: Flow ML Inference & Schema Versioning
    print("\n[TEST 5] Testing ML prediction on flow telemetry...")
    prediction = fanos_predictor.predict_flow(flow_event, source_ip="192.168.56.101")
    assert prediction.feature_schema in (SCHEMA_VERSION_SURICATA_FLOW, "SURICATA_FLOW_NATIVE_V1")
    assert len(prediction.probabilities) == NUM_CLASSES
    print(f"  [OK] Prediction completed: class_id={prediction.predicted_class_id} ({prediction.predicted_class})")
    print(f"  [OK] Confidence={prediction.confidence:.2f}%, Risk Score={prediction.risk_score}")
    print(f"  [OK] Schema Version tagged as '{prediction.feature_schema}'")
    print(f"  [OK] Inference latency: {prediction.inference_ms:.2f} ms")

    print("\n" + "=" * 70)
    print("ALL VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)


if __name__ == "__main__":
    run_all_tests()
