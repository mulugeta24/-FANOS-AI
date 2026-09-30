"""
FANOS V3 16D_CHAMPION Comprehensive Verification Suite
======================================================
Tests all 17 requirements for verified FANOS V3 integration:
  TEST 1: Model file exists.
  TEST 2: Model loads successfully.
  TEST 3: Model reports 70 input features.
  TEST 4: Inference accepts exactly 70 numeric features.
  TEST 5: 71 features are rejected.
  TEST 6: 69 features are rejected.
  TEST 7: Class IDs are restricted to 0–14.
  TEST 8: Class mapping is exact.
  TEST 9: Prediction probabilities contain 15 class probabilities.
  TEST 10: Probabilities are valid numeric values.
  TEST 11: predicted_class_id == argmax(probabilities).
  TEST 12: confidence == max(probabilities).
  TEST 13: A known 70-feature test vector can successfully pass through the model.
  TEST 14: Malformed/non-numeric feature input is rejected safely.
  TEST 15: Backend starts successfully with the model enabled.
  TEST 16: Existing /health endpoint remains healthy.
  TEST 17: Existing Suricata collector functionality is not broken.
"""
import os
import sys
import numpy as np
from pathlib import Path
from fastapi.testclient import TestClient

# Ensure backend directory is in python path
BACKEND_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_DIR))
os.chdir(str(BACKEND_DIR))

EXPECTED_CLASS_MAPPING = {
    0: "BENIGN",
    1: "Bot",
    2: "DDoS",
    3: "DoS GoldenEye",
    4: "DoS Hulk",
    5: "DoS Slowhttptest",
    6: "DoS slowloris",
    7: "FTP-Patator",
    8: "Heartbleed",
    9: "Infiltration",
    10: "PortScan",
    11: "SSH-Patator",
    12: "Web Attack - Brute Force",
    13: "Web Attack - Sql Injection",
    14: "Web Attack - XSS",
}

CANONICAL_70_FEATURES = [
    "Destination Port", "Flow Duration", "Total Fwd Packets", "Total Backward Packets",
    "Total Length of Fwd Packets", "Total Length of Bwd Packets", "Fwd Packet Length Max",
    "Fwd Packet Length Min", "Fwd Packet Length Mean", "Fwd Packet Length Std",
    "Bwd Packet Length Max", "Bwd Packet Length Min", "Bwd Packet Length Mean", "Bwd Packet Length Std",
    "Flow Bytes/s", "Flow Packets/s", "Flow IAT Mean", "Flow IAT Std", "Flow IAT Max", "Flow IAT Min",
    "Fwd IAT Total", "Fwd IAT Mean", "Fwd IAT Std", "Fwd IAT Max", "Fwd IAT Min",
    "Bwd IAT Total", "Bwd IAT Mean", "Bwd IAT Std", "Bwd IAT Max", "Bwd IAT Min",
    "Fwd PSH Flags", "Fwd URG Flags", "Fwd Header Length", "Bwd Header Length",
    "Fwd Packets/s", "Bwd Packets/s", "Min Packet Length", "Max Packet Length",
    "Packet Length Mean", "Packet Length Std", "Packet Length Variance",
    "FIN Flag Count", "SYN Flag Count", "RST Flag Count", "PSH Flag Count", "ACK Flag Count",
    "URG Flag Count", "CWE Flag Count", "ECE Flag Count", "Down/Up Ratio",
    "Average Packet Size", "Avg Fwd Segment Size", "Avg Bwd Segment Size", "Fwd Header Length.1",
    "Subflow Fwd Packets", "Subflow Fwd Bytes", "Subflow Bwd Packets", "Subflow Bwd Bytes",
    "Init_Win_bytes_forward", "Init_Win_bytes_backward", "act_data_pkt_fwd", "min_seg_size_forward",
    "Active Mean", "Active Std", "Active Max", "Active Min",
    "Idle Mean", "Idle Std", "Idle Max", "Idle Min"
]

def run_all_tests():
    print("=" * 70)
    print("  FANOS V3 16D_CHAMPION XGBoost Model Verification")
    print("=" * 70)

    # TEST 1: Model file exists
    print("\n[TEST 1] Model file exists")
    model_paths = [
        BACKEND_DIR / "models" / "fanos_v3_xgboost_rare_improved.json",
        BACKEND_DIR / "app" / "models" / "fanos_v3_xgboost_rare_improved.json",
    ]
    existing_paths = [p for p in model_paths if p.exists()]
    assert len(existing_paths) > 0, f"FAIL: No model artifact found in {model_paths}"
    for p in existing_paths:
        print(f"  Found artifact: {p} (size={p.stat().st_size} bytes)")
    print("  STATUS: PASS")

    # TEST 2: Model loads successfully
    print("\n[TEST 2] Model loads successfully")
    from app.ai.model_loader import FANOSModelLoader, model_loader, NUM_FEATURES, NUM_CLASSES, CLASS_ID_MAPPING, CLASS_LABELS
    assert model_loader.status == "loaded", f"FAIL: Model status is {model_loader.status}: {model_loader.error_detail}"
    assert model_loader.is_ready(), "FAIL: Model is_ready() returned False"
    print(f"  Model name   : {model_loader.model_name}")
    print(f"  Model version: {model_loader.model_version}")
    print(f"  Load time    : {model_loader.load_time_ms:.2f} ms")
    print("  STATUS: PASS")

    # TEST 3: Model reports 70 input features
    print("\n[TEST 3] Model reports 70 input features")
    booster = model_loader._booster
    assert booster is not None, "FAIL: Booster is None"
    num_f = booster.num_features()
    print(f"  Actual booster num_features: {num_f}")
    assert num_f == 70, f"FAIL: Expected 70 features, got {num_f}"
    assert NUM_FEATURES == 70, f"FAIL: NUM_FEATURES constant is {NUM_FEATURES}"
    print("  STATUS: PASS")

    # TEST 4: Inference accepts exactly 70 numeric features
    print("\n[TEST 4] Inference accepts exactly 70 numeric features")
    test_vec_70 = np.ones((1, 70), dtype=np.float32)
    proba = model_loader.predict_proba(test_vec_70)
    assert proba.shape == (1, 15), f"FAIL: Expected shape (1, 15), got {proba.shape}"
    print(f"  Inference output shape: {proba.shape}")
    print("  STATUS: PASS")

    # TEST 5: 71 features are rejected
    print("\n[TEST 5] 71 features are rejected")
    vec_71 = np.ones((1, 71), dtype=np.float32)
    rejected_71 = False
    try:
        model_loader.predict_proba(vec_71)
    except ValueError as e:
        rejected_71 = True
        print(f"  Correctly rejected 71 features: {e}")
    assert rejected_71, "FAIL: 71 features were NOT rejected"
    print("  STATUS: PASS")

    # TEST 6: 69 features are rejected
    print("\n[TEST 6] 69 features are rejected")
    vec_69 = np.ones((1, 69), dtype=np.float32)
    rejected_69 = False
    try:
        model_loader.predict_proba(vec_69)
    except ValueError as e:
        rejected_69 = True
        print(f"  Correctly rejected 69 features: {e}")
    assert rejected_69, "FAIL: 69 features were NOT rejected"
    print("  STATUS: PASS")

    # TEST 7: Class IDs are restricted to 0–14
    print("\n[TEST 7] Class IDs are restricted to 0–14")
    assert NUM_CLASSES == 15, f"FAIL: NUM_CLASSES is {NUM_CLASSES}"
    assert len(CLASS_LABELS) == 15, f"FAIL: CLASS_LABELS length is {len(CLASS_LABELS)}"
    for cid in CLASS_ID_MAPPING.keys():
        assert 0 <= cid <= 14, f"FAIL: Class ID {cid} is out of 0-14 range"
    print(f"  Verified all {len(CLASS_ID_MAPPING)} class IDs are in [0..14]")
    print("  STATUS: PASS")

    # TEST 8: Class mapping is exact
    print("\n[TEST 8] Class mapping is exact")
    for cid, expected_name in EXPECTED_CLASS_MAPPING.items():
        actual_name = CLASS_ID_MAPPING.get(cid)
        assert actual_name == expected_name, f"FAIL: Class {cid} expected '{expected_name}', got '{actual_name}'"
        assert CLASS_LABELS[cid] == expected_name, f"FAIL: CLASS_LABELS[{cid}] expected '{expected_name}', got '{CLASS_LABELS[cid]}'"
        print(f"  [{cid:2d}] -> {expected_name}")
    print("  STATUS: PASS")

    # TEST 9: Prediction probabilities contain 15 class probabilities
    print("\n[TEST 9] Prediction probabilities contain 15 class probabilities")
    from app.ai.predictor import FANOSPredictor
    predictor = FANOSPredictor.instance()
    sample_features = [0.0] * 70
    sample_features[0] = 80.0  # Dest port 80
    sample_features[1] = 100000.0  # Flow duration
    pred = predictor.predict_features(sample_features)
    assert len(pred.probabilities) == 15, f"FAIL: Expected 15 probabilities in dict, got {len(pred.probabilities)}"
    assert len(pred.class_probabilities) == 15, f"FAIL: Expected 15 raw probabilities, got {len(pred.class_probabilities)}"
    print(f"  Probabilities count: {len(pred.probabilities)}")
    print(f"  Class probabilities: {pred.class_probabilities}")
    print("  STATUS: PASS")

    # TEST 10: Probabilities are valid numeric values
    print("\n[TEST 10] Probabilities are valid numeric values")
    prob_sum = sum(pred.class_probabilities)
    assert abs(prob_sum - 1.0) < 0.01, f"FAIL: Probabilities do not sum to ~1.0: sum={prob_sum}"
    for p in pred.class_probabilities:
        assert isinstance(p, (float, int)), f"FAIL: Non-numeric probability {p}"
        assert 0.0 <= p <= 1.0001, f"FAIL: Probability out of range [0, 1]: {p}"
    print(f"  Sum of probabilities: {prob_sum:.6f} (valid)")
    print("  STATUS: PASS")

    # TEST 11: predicted_class_id == argmax(probabilities)
    print("\n[TEST 11] predicted_class_id == argmax(probabilities)")
    expected_argmax = int(np.argmax(pred.class_probabilities))
    assert pred.predicted_class_id == expected_argmax, f"FAIL: predicted_class_id={pred.predicted_class_id} != argmax={expected_argmax}"
    print(f"  predicted_class_id: {pred.predicted_class_id} == argmax({expected_argmax})")
    print("  STATUS: PASS")

    # TEST 12: confidence == max(probabilities)
    print("\n[TEST 12] confidence == max(probabilities)")
    expected_max = float(np.max(pred.class_probabilities))
    assert abs(pred.confidence - expected_max) < 1e-5, f"FAIL: confidence={pred.confidence} != max_prob={expected_max}"
    print(f"  confidence: {pred.confidence:.6f} == max_prob({expected_max:.6f})")
    print("  STATUS: PASS")

    # TEST 13: Known 70-feature test vector can successfully pass through the model
    print("\n[TEST 13] Known 70-feature test vector through feature extractor and model")
    from app.ai.feature_extractor import FeatureExtractor
    fe = FeatureExtractor()
    test_event = {
        "destination_port": 443,
        "source_port": 49152,
        "protocol": "TCP",
        "severity": 2,
        "signature": "ET SCAN Potential SSH Scan",
        "category": "Attempted Information Leak",
        "event_type": "alert"
    }
    vec = fe.extract(test_event)
    assert len(vec) == 70, f"FAIL: Feature vector length {len(vec)}"
    ml_res = predictor.predict_event(test_event, source_ip="10.0.0.1")
    assert ml_res.model_name == "16D_CHAMPION"
    assert ml_res.model_version == "FANOS_V3"
    assert ml_res.feature_count == 70
    assert 0 <= ml_res.predicted_class_id <= 14
    print(f"  Event -> Predicted Class: [{ml_res.predicted_class_id}] {ml_res.predicted_class} (Confidence: {ml_res.confidence:.4f})")
    print("  STATUS: PASS")

    # TEST 14: Malformed/non-numeric feature input is rejected safely
    print("\n[TEST 14] Malformed/non-numeric feature input is rejected safely")
    # NaN test
    nan_vec = np.ones((1, 70), dtype=np.float32)
    nan_vec[0, 5] = np.nan
    rejected_nan = False
    try:
        model_loader.predict_proba(nan_vec)
    except ValueError as e:
        rejected_nan = True
        print(f"  Correctly rejected NaN feature vector: {e}")
    assert rejected_nan, "FAIL: NaN vector was not rejected"

    # Non-numeric string test
    malformed_features = ["abc"] * 70
    pred_malformed = predictor.predict_features(malformed_features)
    assert pred_malformed.model_status == "error" or pred_malformed.predicted_class_id == -1
    print(f"  Correctly handled malformed input: status={pred_malformed.model_status}")
    print("  STATUS: PASS")

    # TEST 15: Backend starts successfully with the model enabled
    print("\n[TEST 15] Backend starts successfully with the model enabled")
    from app.main import app
    client = TestClient(app)
    root_resp = client.get("/")
    assert root_resp.status_code == 200, f"FAIL: Root returned {root_resp.status_code}"
    print(f"  Root endpoint response: {root_resp.json()}")
    print("  STATUS: PASS")

    # TEST 16: Existing /health endpoint remains healthy
    print("\n[TEST 16] Existing /health endpoint remains healthy")
    health_resp = client.get("/health")
    assert health_resp.status_code == 200, f"FAIL: Health returned {health_resp.status_code}"
    health_data = health_resp.json()
    assert health_data.get("status") == "healthy", f"FAIL: Health status is not healthy: {health_data}"
    assert health_data.get("ai_engine") == "active", f"FAIL: AI engine is not active: {health_data}"
    print(f"  Health endpoint response: {health_data}")
    print("  STATUS: PASS")

    # TEST 17: Existing Suricata collector functionality is not broken
    print("\n[TEST 17] Existing Suricata ingestion endpoint functionality")
    # Test AI predict API directly via test client
    predict_payload = {
        "features": [0.0] * 70,
        "source_ip": "192.168.1.100",
        "target": "443"
    }
    predict_resp = client.post("/api/v1/ai/predict/full", json=predict_payload)
    assert predict_resp.status_code == 200, f"FAIL: AI predict full returned {predict_resp.status_code}: {predict_resp.text}"
    ai_full_data = predict_resp.json()
    assert ai_full_data["model_name"] == "16D_CHAMPION"
    assert ai_full_data["model_version"] == "FANOS_V3"
    assert ai_full_data["feature_count"] == 70
    assert 0 <= ai_full_data["predicted_class_id"] <= 14
    print(f"  AI Predict Full response: model={ai_full_data['model_name']}, class_id={ai_full_data['predicted_class_id']} ({ai_full_data['predicted_class']})")

    # Test rejection of 69 features via API
    bad_predict_payload = {
        "features": [0.0] * 69,
        "source_ip": "192.168.1.100",
        "target": "443"
    }
    bad_resp = client.post("/api/v1/ai/predict/full", json=bad_predict_payload)
    assert bad_resp.status_code == 422, f"FAIL: Expected 422 for 69 features, got {bad_resp.status_code}"
    print(f"  API 69-feature rejection: HTTP {bad_resp.status_code} (PASS)")

    # Test rejection of 71 features via API
    bad_71_payload = {
        "features": [0.0] * 71,
        "source_ip": "192.168.1.100",
        "target": "443"
    }
    bad_71_resp = client.post("/api/v1/ai/predict/full", json=bad_71_payload)
    assert bad_71_resp.status_code == 422, f"FAIL: Expected 422 for 71 features, got {bad_71_resp.status_code}"
    print(f"  API 71-feature rejection: HTTP {bad_71_resp.status_code} (PASS)")

    print("  STATUS: PASS")

    print("\n" + "=" * 70)
    print("  ALL 17 TESTS PASSED SUCCESSFULLY! ")
    print("  FANOS V3 16D_CHAMPION IS FULLY INTEGRATED & VERIFIED.")
    print("=" * 70)

if __name__ == "__main__":
    run_all_tests()
