"""
Unit Tests for ML URL Threat Detector (17 Lexical & Structural Features)
"""
import pytest
import os
import sys

# Ensure backend is on sys.path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.services.threat_detection.url_detector import URLDetector, FEATURE_NAMES


def test_url_detector_feature_extraction():
    detector = URLDetector.get_instance()
    test_url = "https://secure-login.bank.com/auth?token=12345"
    ordered_feats, feats_dict = detector.extract_features(test_url)

    # Must contain exactly 17 features
    assert len(ordered_feats) == 17, f"Expected 17 features, got {len(ordered_feats)}"
    assert len(feats_dict) == 17

    # Verify key feature names exist
    assert "URL_LENGTH" in feats_dict
    assert "HAS_HTTPS" in feats_dict
    assert feats_dict["HAS_HTTPS"] == 1
    assert "SUSPICIOUS_KEYWORDS" in feats_dict
    assert feats_dict["SUSPICIOUS_KEYWORDS"] >= 2  # 'secure', 'login', 'bank'


def test_url_detector_model_prediction():
    detector = URLDetector.get_instance()
    assert detector.is_ready, "ML URL Detector model should be loaded"

    test_urls = [
        "https://www.google.com",
        "http://update-account-verification-login.xyz/banking",
    ]

    for u in test_urls:
        res = detector.predict(u)
        assert "label" in res
        assert "confidence" in res
        assert "probabilities" in res
        assert "features" in res
        assert res["label"] in ["benign", "defacement", "malicious", "phishing"]
        assert 0.0 <= res["confidence"] <= 1.0

        # Probabilities should cover all 4 classes
        probs = res["probabilities"]
        assert len(probs) == 4
        assert abs(sum(probs.values()) - 1.0) < 0.05
