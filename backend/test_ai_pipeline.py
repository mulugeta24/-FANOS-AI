"""
FANOS AI Integration Test
==========================
Tests the complete pipeline:
  Model loads → Features extracted → XGBoost runs → Risk scored → Result structured

Run from: c:\Fanos Aii\backend
  python test_ai_pipeline.py
"""
import sys
import os

# Ensure we import from the backend app
sys.path.insert(0, os.path.dirname(__file__))
os.chdir(os.path.dirname(__file__))   # so relative model paths resolve

print("=" * 65)
print("  FANOS AI Integration Test (16D_CHAMPION)")
print("=" * 65)

# ──────────────────────────────────────────────────────────────────────
# Test 1: Model Loader
# ──────────────────────────────────────────────────────────────────────
print("\n[TEST 1] Model Loader")
from app.ai.model_loader import FANOSModelLoader, NUM_FEATURES, NUM_CLASSES, CLASS_LABELS

loader = FANOSModelLoader.instance()
print(f"  status      : {loader.status}")
print(f"  model_name  : {loader.model_name}")
print(f"  load_time   : {loader.load_time_ms:.1f} ms")
print(f"  num_features: {NUM_FEATURES}")
print(f"  num_classes : {NUM_CLASSES}")
print(f"  classes     : {CLASS_LABELS}")

assert loader.status == "loaded", f"FAIL: Model not loaded — {loader.error_detail}"
assert loader.is_ready(), "FAIL: Model is_ready() returned False"
assert loader.model_name == "16D_CHAMPION", f"FAIL: Model name is {loader.model_name}"
assert NUM_FEATURES == 70
assert NUM_CLASSES == 15
print("  PASS OK")

# ──────────────────────────────────────────────────────────────────────
# Test 2: Feature Extractor
# ──────────────────────────────────────────────────────────────────────
print("\n[TEST 2] Feature Extractor")
from app.ai.feature_extractor import FeatureExtractor, NUM_FEATURES as FE_NUM

fe = FeatureExtractor()

# Test with a Suricata-style alert event
test_event = {
    "destination_port": 8080,
    "source_port":      54321,
    "protocol":         "TCP",
    "severity":         2,
    "signature":        "ET SCAN Nmap SYN Scan Detected",
    "category":         "Port Scan",
    "event_type":       "alert",
}
vec = fe.extract(test_event)
print(f"  shape       : {vec.shape}")
print(f"  dtype       : {vec.dtype}")
print(f"  sum         : {vec.sum():.4f}")
print(f"  first 5     : {vec[:5].tolist()}")

assert vec.shape == (NUM_FEATURES,), f"FAIL: expected ({NUM_FEATURES},), got {vec.shape}"
assert str(vec.dtype) == "float32", f"FAIL: expected float32, got {vec.dtype}"
import numpy as np
assert not np.isnan(vec).any(), "FAIL: NaN values in feature vector"
print("  PASS OK")

# ──────────────────────────────────────────────────────────────────────
# Test 3: Direct XGBoost Prediction
# ──────────────────────────────────────────────────────────────────────
print("\n[TEST 3] Direct XGBoost Prediction")
proba = loader.predict_proba(vec)
print(f"  proba shape : {proba.shape}")
print(f"  proba sum   : {proba.sum():.6f}")
print(f"  argmax      : {np.argmax(proba[0])} ({CLASS_LABELS[np.argmax(proba[0])]})")
print(f"  max_proba   : {proba[0].max():.6f}")

assert proba.shape == (1, NUM_CLASSES), f"FAIL: expected (1,{NUM_CLASSES}), got {proba.shape}"
assert abs(proba.sum() - 1.0) < 0.01, f"FAIL: probabilities don't sum to 1: {proba.sum()}"
print("  PASS OK")

# ──────────────────────────────────────────────────────────────────────
# Test 4: Full Predictor Pipeline (event dict)
# ──────────────────────────────────────────────────────────────────────
print("\n[TEST 4] Full Predictor Pipeline (event dict)")
from app.ai.predictor import FANOSPredictor

predictor = FANOSPredictor.instance()
result = predictor.predict_event(
    event=test_event,
    source_ip="192.168.56.20",
    target_path="/api/v1/login",
)

print(f"  model_name  : {result.model_name}")
print(f"  model_status: {result.model_status}")
print(f"  class_id    : {result.predicted_class_id}")
print(f"  class       : {result.predicted_class}")
print(f"  prediction  : {result.prediction}")
print(f"  confidence  : {result.confidence:.4f}")
print(f"  is_malicious: {result.is_malicious}")
print(f"  risk_score  : {result.risk_score}")
print(f"  risk_level  : {result.risk_level}")
print(f"  inference_ms: {result.inference_ms:.2f}")
print(f"  top-3 probs : {sorted(result.probabilities.items(), key=lambda x: -x[1])[:3]}")

assert result.model_status == "loaded", f"FAIL: model_status={result.model_status}"
assert result.confidence >= 0.0, "FAIL: negative confidence"
assert result.confidence <= 1.0001, "FAIL: confidence > 1"
assert result.risk_score >= 0, "FAIL: negative risk_score"
assert result.risk_score <= 100, "FAIL: risk_score > 100"
assert result.risk_level in ("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO")
assert len(result.probabilities) == NUM_CLASSES
print("  PASS OK")

# ──────────────────────────────────────────────────────────────────────
# Test 5: Predictor with raw feature vector (ai/predict endpoint path)
# ──────────────────────────────────────────────────────────────────────
print("\n[TEST 5] Predictor with raw feature vector")
raw_features = [float(x) for x in vec.tolist()]
result2 = predictor.predict_features(
    features=raw_features,
    source_ip="10.0.0.5",
    target_path="/admin",
)
print(f"  class_id    : {result2.predicted_class_id}")
print(f"  prediction  : {result2.prediction}")
print(f"  confidence  : {result2.confidence:.4f}")
print(f"  risk_score  : {result2.risk_score}")
print(f"  num_features: {result2.num_features}")

assert result2.num_features == NUM_FEATURES
assert result2.model_status == "loaded"
print("  PASS OK")

# ──────────────────────────────────────────────────────────────────────
# Test 6: Multiple event type predictions
# ──────────────────────────────────────────────────────────────────────
print("\n[TEST 6] Multiple event type predictions")
test_cases = [
    {"name": "HTTP DDoS",     "event": {"destination_port": 80,   "protocol": "TCP", "severity": 1, "signature": "ET DDoS HTTP Flood", "category": "DDoS"}},
    {"name": "SSH BruteForce","event": {"destination_port": 22,   "protocol": "TCP", "severity": 2, "signature": "ET SCAN SSH BruteForce", "category": "Port Scan"}},
    {"name": "DNS query",     "event": {"destination_port": 53,   "protocol": "UDP", "severity": 4, "signature": "Normal DNS", "category": "Network"}},
    {"name": "SQL injection", "event": {"destination_port": 3306, "protocol": "TCP", "severity": 1, "signature": "ET SQL Injection", "category": "Web Application Attack"}},
]

for tc in test_cases:
    r = predictor.predict_event(tc["event"], source_ip="192.168.56.99")
    print(f"  {tc['name']:<18} -> [{r.predicted_class_id}] {r.prediction:<20} conf={r.confidence:.4f} risk={r.risk_score}")

print("  PASS OK")

# ──────────────────────────────────────────────────────────────────────
# Test 7: Engine status
# ──────────────────────────────────────────────────────────────────────
print("\n[TEST 7] AI Engine status")
from app.ai.engine import FANOSAIEngine
engine = FANOSAIEngine()
status = engine.get_status()
print(f"  status      : {status['status']}")
print(f"  model_name  : {status['model_name']}")
print(f"  num_features: {status['num_features']}")
print(f"  num_classes : {status['num_classes']}")

assert status["status"] == "Production", f"FAIL: status={status['status']}"
assert status["model_name"] == "16D_CHAMPION"
print("  PASS OK")

print("\n" + "=" * 65)
print("  ALL TESTS PASSED OK  — FANOS 16D_CHAMPION IS FUNCTIONAL")
print("=" * 65)
