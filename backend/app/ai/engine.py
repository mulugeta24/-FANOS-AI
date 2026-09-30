"""
FANOS AI Engine — XGBoost-based Intrusion Detection Model
==========================================================
Backward-compatible shim that delegates to the verified 16D_CHAMPION FANOS V3
model_loader + predictor while preserving the existing public API.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import List, Optional

logger = logging.getLogger("fanos.ai")


@dataclass
class PredictionResult:
    attack_detected:  bool
    attack_type:      str
    confidence:       float
    risk_score:       int
    severity:         str
    recommendation:   str
    inference_ms:     float


class FANOSAIEngine:
    """
    Singleton AI Engine — backward-compatible wrapper.

    predict(features) routes to the verified 16D_CHAMPION XGBoost model via
    FANOSPredictor.
    """

    _instance: Optional["FANOSAIEngine"] = None

    def __new__(cls) -> "FANOSAIEngine":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return
        self._initialized = True

        from app.ai.model_loader import model_loader, MODEL_NAME, MODEL_VERSION
        from app.ai.predictor import fanos_predictor

        self._loader = model_loader
        self._predictor = fanos_predictor

        self.model_name = MODEL_NAME
        self.model_version = MODEL_VERSION

        # Verified audit metrics for 16D_CHAMPION
        self.accuracy   = 0.9986890930 * 100.0
        self.precision  = 0.9016564276 * 100.0
        self.recall     = 0.9090848723 * 100.0
        self.f1_score   = 0.9027210607 * 100.0

        self._request_count = 0
        self._total_latency = 0.0

        logger.info(
            "[AI Engine] Initialized | model=%s | version=%s | status=%s",
            self.model_name,
            self.model_version,
            self._loader.status,
        )

    # ── Status ────────────────────────────────────────────────────────────

    @property
    def status(self) -> str:
        s = self._loader.status
        if s == "loaded":
            return "Production"
        if s == "unavailable":
            return "Unavailable"
        if s == "error":
            return "Error"
        return "Initializing"

    @property
    def requests_per_sec(self) -> int:
        if self._total_latency == 0:
            return 0
        avg_ms = self._total_latency / max(self._request_count, 1)
        return int(1000 / avg_ms) if avg_ms > 0 else 0

    # ── Prediction ────────────────────────────────────────────────────────

    def predict(self, features: List[float]) -> PredictionResult:
        """
        Run inference on a pre-built 70-feature vector.
        Routes to real XGBoost model (16D_CHAMPION).
        """
        import time
        t0 = time.perf_counter()

        ml = self._predictor.predict_features(features)

        elapsed_ms = (time.perf_counter() - t0) * 1000
        self._request_count += 1
        self._total_latency += elapsed_ms

        attack_detected = ml.is_malicious
        severity = ml.risk_level

        return PredictionResult(
            attack_detected=attack_detected,
            attack_type=ml.attack_type,
            confidence=ml.confidence,
            risk_score=ml.risk_score,
            severity=severity,
            recommendation=ml.recommendation,
            inference_ms=round(elapsed_ms, 2),
        )

    def get_status(self) -> dict:
        loader_status = self._loader.get_status_dict()
        return {
            "model_name":       self.model_name,
            "model_version":    self.model_version,
            "status":           self.status,
            "accuracy":         round(self.accuracy, 4),
            "precision":        round(self.precision, 4),
            "recall":           round(self.recall, 4),
            "f1_score":         round(self.f1_score, 4),
            "inference_ms":     round(self._total_latency / max(self._request_count, 1), 2),
            "requests_per_sec": self.requests_per_sec or 0,
            "num_features":     loader_status.get("num_features", 70),
            "num_classes":      loader_status.get("num_classes", 15),
            "load_time_ms":     loader_status.get("load_time_ms", 0.0),
            "model_error":      loader_status.get("error_detail"),
        }


# Module-level singleton
ai_engine = FANOSAIEngine()
