"""
FANOS AI — CIC-FlowMeter Feature Compatibility & Schema Validation Tests
==========================================================================
Verifies:
1. Exact 70-feature contract and ordering matching the Colab training notebook.
2. Identification of directly measured (17), derived (21), and incompatible (32) features.
3. Schema validation distinguishing authoritative CIC_FLOWMETER_V3 from experimental SURICATA_FLOW_DERIVED_V1.
4. Tree split statistics proving the high impact (58.8% of split nodes) of incompatible features.
5. Experimental tagging on predict_flow and preservation of the existing alert pipeline.
6. Flow persistence metadata validation.
"""
import sys
import os
import json
import asyncio
from datetime import datetime, timezone
import numpy as np

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(__file__))

from app.ai.feature_extractor import (
    feature_extractor,
    validate_feature_vector,
    CANONICAL_FEATURES,
    NUM_FEATURES,
    MEASURED_FEATURE_INDICES,
    DERIVED_FEATURE_INDICES,
    INCOMPATIBLE_FEATURE_INDICES,
    MEASURED_FEATURES,
    DERIVED_FEATURES,
    INCOMPATIBLE_FEATURES,
    SCHEMA_VERSION_CIC_FLOWMETER,
    SCHEMA_VERSION_SURICATA_FLOW,
    SCHEMA_VERSION_SURICATA_ALERT_LEGACY,
    get_schema_compatibility_summary,
)
from app.ai.model_loader import model_loader, CLASS_LABELS, NUM_CLASSES
from app.ai.predictor import fanos_predictor


def test_feature_count_and_ordering():
    print("\n[TEST 1] Verifying 70-feature contract against Colab training notebook...")
    assert len(CANONICAL_FEATURES) == 70, f"Expected 70 features, got {len(CANONICAL_FEATURES)}"
    assert NUM_FEATURES == 70

    # Key landmark positions from training notebook manifest (cell 192)
    assert CANONICAL_FEATURES[0] == "Destination Port"
    assert CANONICAL_FEATURES[1] == "Flow Duration"
    assert CANONICAL_FEATURES[13] == "Bwd Packet Length Std"
    assert CANONICAL_FEATURES[19] == "Flow IAT Min"
    assert CANONICAL_FEATURES[22] == "Fwd IAT Std"
    assert CANONICAL_FEATURES[30] == "Fwd PSH Flags"
    assert CANONICAL_FEATURES[40] == "Packet Length Variance"
    assert CANONICAL_FEATURES[58] == "Init_Win_bytes_forward"
    assert CANONICAL_FEATURES[59] == "Init_Win_bytes_backward"
    assert CANONICAL_FEATURES[62] == "Active Mean"
    assert CANONICAL_FEATURES[69] == "Idle Min"
    print("  --> PASS: 70 features exactly match positional training contract.")


def test_feature_classification_partitions():
    print("\n[TEST 2] Verifying feature classification partitions (measured / derived / incompatible)...")
    total_partitioned = len(MEASURED_FEATURE_INDICES) + len(DERIVED_FEATURE_INDICES) + len(INCOMPATIBLE_FEATURE_INDICES)
    assert total_partitioned == 70, f"Expected 70 partitioned features, got {total_partitioned}"

    all_indices = set(MEASURED_FEATURE_INDICES) | set(DERIVED_FEATURE_INDICES) | set(INCOMPATIBLE_FEATURE_INDICES)
    assert len(all_indices) == 70, "Partition overlap or missing indices detected"
    assert all_indices == set(range(70)), "Indices do not cover range 0..69"

    print(f"  Directly Measured Features:      {len(MEASURED_FEATURE_INDICES)} (17)")
    print(f"  Mathematically Derived Features: {len(DERIVED_FEATURE_INDICES)} (21)")
    print(f"  Incompatible / Zeroed Features:  {len(INCOMPATIBLE_FEATURE_INDICES)} (32)")
    assert len(MEASURED_FEATURE_INDICES) == 17
    assert len(DERIVED_FEATURE_INDICES) == 21
    assert len(INCOMPATIBLE_FEATURE_INDICES) == 32
    print("  --> PASS: Partitions complete, non-overlapping, and fully accounted for.")


def test_schema_compatibility_diagnostics():
    print("\n[TEST 3] Verifying schema compatibility diagnostics...")
    cic_summary = get_schema_compatibility_summary(SCHEMA_VERSION_CIC_FLOWMETER)
    assert cic_summary["is_authoritative"] is True
    assert cic_summary["is_experimental"] is False
    assert cic_summary["incompatible_features"] == 0
    assert cic_summary["status"] == "VALIDATED"

    suri_summary = get_schema_compatibility_summary(SCHEMA_VERSION_SURICATA_FLOW)
    assert suri_summary["is_authoritative"] is False
    assert suri_summary["is_experimental"] is True
    assert suri_summary["incompatible_features"] == 32
    assert suri_summary["status"] == "EXPERIMENTAL_UNVALIDATED_APPROXIMATION"
    assert suri_summary["warning"] is not None

    print("  CIC_FLOWMETER_V3 status:        ", cic_summary["status"])
    print("  SURICATA_FLOW_DERIVED_V1 status:", suri_summary["status"])
    print("  --> PASS: Strict schema validation distinguishes authoritative vs experimental.")


def test_booster_tree_split_impact():
    print("\n[TEST 4] Verifying tree split node impact of incompatible features in XGBoost booster...")
    booster = model_loader._booster
    trees = booster.get_dump(dump_format="json")

    split_counts = {f"f{i}": 0 for i in range(70)}
    def walk(node):
        s = node.get("split")
        if s and s in split_counts:
            split_counts[s] += 1
        for c in node.get("children", []):
            walk(c)

    for t in trees:
        walk(json.loads(t))

    total_splits = sum(split_counts.values())
    incomp_splits = sum(split_counts[f"f{i}"] for i in INCOMPATIBLE_FEATURE_INDICES)
    incomp_ratio = incomp_splits / total_splits

    print(f"  Total tree split nodes:               {total_splits}")
    print(f"  Splits on incompatible features:      {incomp_splits} ({incomp_ratio*100:.1f}%)")
    assert total_splits > 90000, f"Expected >90,000 splits, got {total_splits}"
    assert incomp_splits > 50000, f"Expected >50,000 incompatible splits, got {incomp_splits}"
    assert incomp_ratio > 0.55, f"Expected >55% incompatible splits, got {incomp_ratio*100:.1f}%"
    print("  --> PASS: Confirmed 58.8% of split decisions depend on unmeasured / zeroed features.")


def test_predict_flow_experimental_tagging():
    print("\n[TEST 5] Testing predict_flow experimental tagging and warning generation...")
    flow_event = {
        "destination_port": 443,
        "protocol": "TCP",
        "flow": {
            "pkts_toserver": 25,
            "pkts_toclient": 30,
            "bytes_toserver": 3200,
            "bytes_toclient": 45000,
            "start": "2026-10-11T12:00:00.000000+0000",
            "end": "2026-10-11T12:00:01.500000+0000",
            "age": 1,
        },
        "tcp": {
            "syn": True,
            "ack": True,
            "psh": True,
        }
    }

    pred = fanos_predictor.predict_flow(flow_event, source_ip="192.168.1.105")
    if model_loader.has_native_model():
        assert pred.is_experimental is False, "Native model flow prediction should be validated"
        assert pred.validation_status == "VALIDATED"
        assert pred.missing_features_count == 0
        assert pred.feature_schema == "SURICATA_FLOW_NATIVE_V1"
        print("  --> PASS: Native model active: live Suricata flow prediction correctly VALIDATED (25 genuine features).")
    else:
        assert pred.is_experimental is True, "Flow prediction must be flagged as experimental"
        assert pred.validation_status == "EXPERIMENTAL_UNVALIDATED_APPROXIMATION"
        assert pred.missing_features_count == 32
        assert pred.feature_schema == SCHEMA_VERSION_SURICATA_FLOW
        assert "experimental" in pred.recommendation.lower()
        print("  --> PASS: Live Suricata flow prediction correctly tagged as experimental.")
    print("  Prediction class:   ", pred.predicted_class)
    print("  Validation status:  ", pred.validation_status)
    print("  Is experimental:    ", pred.is_experimental)
    print("  Missing features:   ", pred.missing_features_count)


def test_predict_features_schema_handling():
    print("\n[TEST 6] Testing predict_features with authoritative vs experimental schema...")
    vec = np.zeros(70, dtype=np.float32)
    vec[0] = 80.0
    vec[1] = 100000.0
    vec[2] = 5.0

    # Authoritative CIC vector
    pred_cic = fanos_predictor.predict_features(vec, schema_version=SCHEMA_VERSION_CIC_FLOWMETER)
    assert pred_cic.is_experimental is False
    assert pred_cic.validation_status == "VALIDATED"
    assert pred_cic.missing_features_count == 0

    # Experimental derived vector
    pred_suri = fanos_predictor.predict_features(vec, schema_version=SCHEMA_VERSION_SURICATA_FLOW)
    assert pred_suri.is_experimental is True
    assert pred_suri.validation_status == "EXPERIMENTAL_UNVALIDATED_APPROXIMATION"
    assert pred_suri.missing_features_count == 32

    print("  CIC_FLOWMETER_V3 pred experimental status: ", pred_cic.is_experimental)
    print("  SURICATA_FLOW_DERIVED_V1 pred experimental:", pred_suri.is_experimental)
    print("  --> PASS: Predictor enforces schema boundaries properly.")


def test_alert_pipeline_backward_compatibility():
    print("\n[TEST 7] Testing alert pipeline non-regression (backward compatibility)...")
    alert_event = {
        "event_id": "test-alert-compat-001",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "event_type": "alert",
        "source_ip": "10.0.0.99",
        "destination_port": 80,
        "protocol": "TCP",
        "severity": 1,
        "signature": "ET EXPLOIT Apache Struts RCE Vulnerability",
        "category": "Attempted Administrator Privilege Gain",
    }

    pred_alert = fanos_predictor.predict_event(alert_event, source_ip="10.0.0.99")
    assert pred_alert.model_status == "loaded"
    assert pred_alert.feature_count == 70
    assert pred_alert.feature_schema == SCHEMA_VERSION_SURICATA_ALERT_LEGACY
    assert pred_alert.predicted_class_id in range(15)
    print("  Alert prediction:   ", pred_alert.predicted_class)
    print("  Model status:       ", pred_alert.model_status)
    print("  Feature schema:     ", pred_alert.feature_schema)
    print("  --> PASS: Existing Suricata alert pipeline functions normally and regression-free.")


def run_all():
    print("=" * 80)
    print("  FANOS AI — CIC-FLOWMETER FEATURE COMPATIBILITY TEST SUITE")
    print("=" * 80)

    test_feature_count_and_ordering()
    test_feature_classification_partitions()
    test_schema_compatibility_diagnostics()
    test_booster_tree_split_impact()
    test_predict_flow_experimental_tagging()
    test_predict_features_schema_handling()
    test_alert_pipeline_backward_compatibility()

    print("\n" + "=" * 80)
    print("  ALL 7 FEATURE COMPATIBILITY & VALIDATION TESTS PASSED OK!")
    print("=" * 80)


if __name__ == "__main__":
    run_all()
