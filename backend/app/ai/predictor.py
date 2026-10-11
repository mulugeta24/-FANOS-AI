"""
FANOS AI Predictor
==================
Orchestrates the end-to-end prediction pipeline for verified FANOS V3 (16D_CHAMPION):

  Suricata / FANOS event dict
  → Feature Extraction & Validation (feature_extractor.py, 70 features)
  → 16D_CHAMPION XGBoost Inference  (model_loader.py, multi:softprob)
  → Argmax Class ID (0–14) & Max Probability Confidence
  → Risk Scoring                    (risk_engine.py)
  → Structured MLPrediction result

Inference layer follows the exact FANOS V3 70-feature contract and 15-class mapping.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Optional, Dict, List

import numpy as np

from app.ai.feature_extractor import (
    feature_extractor,
    validate_feature_vector,
    NUM_FEATURES,
    INCOMPATIBLE_FEATURES,
    SCHEMA_VERSION_CIC_FLOWMETER,
    SCHEMA_VERSION_SURICATA_FLOW,
    SCHEMA_VERSION_SURICATA_ALERT_LEGACY,
)
from app.ai.model_loader import (
    CLASS_LABELS,
    CLASS_ID_MAPPING,
    NUM_CLASSES,
    MODEL_NAME,
    MODEL_VERSION,
    display_name_for,
    is_malicious,
    label_for,
    model_loader,
)
from app.ai.risk_engine import RiskContext, risk_engine

logger = logging.getLogger("fanos.ai.predictor")


@dataclass
class MLPrediction:
    """Structured result returned by FANOSPredictor."""
    # Model Identity
    model_name:         str = MODEL_NAME
    model_version:      str = MODEL_VERSION
    model:              str = MODEL_NAME
    model_status:       str = "loaded"
    feature_count:      int = NUM_FEATURES
    num_features:       int = NUM_FEATURES

    # Raw ML output
    predicted_class_id: int = 0
    predicted_class:    str = "BENIGN"
    raw_label:          str = "BENIGN"
    prediction:         str = "Normal"               # display name
    confidence:         float = 0.0                 # max(probabilities)
    probabilities:      Dict[str, float] = field(default_factory=dict)
    class_probabilities: List[float] = field(default_factory=list)

    # Derived SOC & Risk fields
    is_malicious:       bool = False
    attack_type:        str = "Normal"
    risk_level:         str = "INFO"
    risk_score:         int = 0
    recommendation:     str = "Record event for baseline analysis."
    inference_ms:       float = 0.0
    feature_schema:     str = "SURICATA_ALERT_LEGACY"

    # Schema Validation & Integrity Metadata
    is_experimental:        bool = False
    validation_status:      str = "VALIDATED"
    missing_features_count: int = 0
    compatibility_warning:  Optional[str] = None


_RECOMMENDATION_MAP = {
    "CRITICAL": "Block source IP immediately and escalate to SOC team.",
    "HIGH":     "Block source IP and create incident for investigation.",
    "MEDIUM":   "Monitor closely, apply WAF rule, and alert SOC analyst.",
    "LOW":      "Log event and monitor for pattern escalation.",
    "INFO":     "Record event for baseline analysis.",
}

# Map display name → risk_engine attack type key
_DISPLAY_TO_RISK_TYPE: Dict[str, str] = {
    "Normal":            "Normal",
    "Botnet / C&C":      "Botnet",
    "DDoS":              "DDoS",
    "DoS GoldenEye":     "DDoS",
    "DoS Hulk":          "DDoS",
    "DoS Slowhttptest":  "DDoS",
    "DoS Slowloris":     "DDoS",
    "FTP Brute Force":   "Brute Force",
    "Heartbleed":        "Command Injection",
    "Infiltration":      "SSRF",
    "Port Scan":         "Port Scan",
    "SSH Brute Force":   "Brute Force",
    "Brute Force":       "Brute Force",
    "SQL Injection":     "SQL Injection",
    "XSS":               "XSS",
}


class FANOSPredictor:
    """
    Production predictor — singleton pattern.
    """

    _instance: Optional["FANOSPredictor"] = None

    @classmethod
    def instance(cls) -> "FANOSPredictor":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # ── Public API ────────────────────────────────────────────────────────

    def predict_event(
        self,
        event: dict[str, Any],
        source_ip: Optional[str] = None,
        target_path: Optional[str] = None,
        rule_match=None,
    ) -> MLPrediction:
        """
        Run the full prediction pipeline for one event dict.
        """
        t_start = time.perf_counter()

        # 1. Check model availability
        if not model_loader.is_ready():
            logger.warning("[ML] Model %s unavailable — status: %s", MODEL_NAME, model_loader.status)
            return self._unavailable_result()

        try:
            # 2. Feature extraction (exact 70 features)
            feature_vec = feature_extractor.extract(event)
            return self._run_inference(
                feature_vec=feature_vec,
                source_ip=source_ip,
                target_path=target_path,
                rule_match=rule_match,
                t_start=t_start,
            )

        except Exception as exc:
            logger.exception("[ML] Prediction error: %s", exc)
            return self._error_result(str(exc))

    def predict_flow(
        self,
        flow_event: dict[str, Any],
        source_ip: Optional[str] = None,
        target_path: Optional[str] = None,
        rule_match=None,
    ) -> MLPrediction:
        """
        Run genuine flow-based prediction pipeline for one Suricata flow record.
        Schema: SURICATA_FLOW_DERIVED_V1
        """
        t_start = time.perf_counter()

        if not model_loader.is_ready():
            logger.warning("[ML] Model %s unavailable — status: %s", MODEL_NAME, model_loader.status)
            return self._unavailable_result()

        try:
            if model_loader.has_native_model():
                feature_vec, schema_version = feature_extractor.extract_suricata_native_flow(flow_event)
                pred = self._run_inference(
                    feature_vec=feature_vec,
                    source_ip=source_ip,
                    target_path=target_path,
                    rule_match=rule_match,
                    t_start=t_start,
                )
                pred.feature_schema = schema_version
                pred.model_name = getattr(model_loader, "native_model_name", "SURICATA_FLOW_NATIVE_V1")
                pred.model_version = getattr(model_loader, "native_model_version", "FANOS_V3_NATIVE")
                pred.num_features = len(feature_vec)
                pred.feature_count = len(feature_vec)
                pred.is_experimental = False
                pred.validation_status = "VALIDATED"
                pred.missing_features_count = 0
                pred.compatibility_warning = None
                if pred.is_malicious:
                    pred.recommendation = f"ML Flow Detection ({pred.prediction}): Isolate/inspect flow from {source_ip or 'source'}."
                else:
                    pred.recommendation = "Normal bidirectional network flow recorded."
                return pred

            feature_vec, schema_version = feature_extractor.extract_from_suricata_flow(flow_event)
            pred = self._run_inference(
                feature_vec=feature_vec,
                source_ip=source_ip,
                target_path=target_path,
                rule_match=rule_match,
                t_start=t_start,
            )
            pred.feature_schema = schema_version
            pred.is_experimental = True
            pred.validation_status = "EXPERIMENTAL_UNVALIDATED_APPROXIMATION"
            pred.missing_features_count = len(INCOMPATIBLE_FEATURES)
            pred.compatibility_warning = (
                "Suricata EVE summary flow telemetry cannot provide packet variance, "
                "extrema, TCP initial window sizes, or active/idle burst metrics. "
                f"{len(INCOMPATIBLE_FEATURES)}/70 features are approximated or zero-grounded."
            )
            if pred.is_malicious:
                pred.recommendation = (
                    f"Experimental ML Flow Detection ({pred.prediction}): "
                    f"Inspect flow from {source_ip or 'source'}. "
                    "Unvalidated flow schema must be evaluated against labeled traffic."
                )
            else:
                pred.recommendation = "Normal bidirectional network flow recorded (experimental schema)."
            return pred

        except Exception as exc:
            logger.exception("[ML] Flow prediction error: %s", exc)
            return self._error_result(str(exc))

    def predict_features(
        self,
        features: list[float] | np.ndarray,
        source_ip: Optional[str] = None,
        target_path: Optional[str] = None,
        rule_match=None,
        schema_version: Optional[str] = None,
    ) -> MLPrediction:
        """
        Run prediction on a pre-built feature vector (for /api/v1/ai/predict).
        Strictly validates feature length == 70 and numeric validity.
        """
        t_start = time.perf_counter()

        if not model_loader.is_ready():
            logger.warning("[ML] Model %s unavailable — status: %s", MODEL_NAME, model_loader.status)
            return self._unavailable_result()

        try:
            feature_vec = validate_feature_vector(features)
            pred = self._run_inference(
                feature_vec=feature_vec,
                source_ip=source_ip,
                target_path=target_path,
                rule_match=rule_match,
                t_start=t_start,
            )
            if schema_version == SCHEMA_VERSION_SURICATA_FLOW:
                pred.feature_schema = schema_version
                pred.is_experimental = True
                pred.validation_status = "EXPERIMENTAL_UNVALIDATED_APPROXIMATION"
                pred.missing_features_count = len(INCOMPATIBLE_FEATURES)
                pred.compatibility_warning = "Suricata summary telemetry approximation."
            else:
                pred.feature_schema = schema_version or SCHEMA_VERSION_CIC_FLOWMETER
                pred.is_experimental = False
                pred.validation_status = "VALIDATED"
                pred.missing_features_count = 0
                pred.compatibility_warning = None
            return pred

        except Exception as exc:
            logger.exception("[ML] predict_features error: %s", exc)
            return self._error_result(str(exc))

    def _run_inference(
        self,
        feature_vec: np.ndarray,
        source_ip: Optional[str],
        target_path: Optional[str],
        rule_match,
        t_start: float,
    ) -> MLPrediction:
        """Execute model inference, class selection, probability extraction, and risk scoring."""
        # 1. XGBoost inference
        proba_matrix = model_loader.predict_proba(feature_vec)   # shape (1, 15)
        proba = proba_matrix[0]                                   # shape (15,)

        # 2. Deterministic Class Selection (0–14)
        class_idx = int(np.argmax(proba))
        max_prob = float(proba[class_idx])
        confidence = max_prob * 100.0  # percentage for display / risk engine

        raw_label = label_for(class_idx)
        display = display_name_for(raw_label)
        malicious = is_malicious(class_idx)

        # 3. Probability dictionary and raw list
        prob_dict = {
            CLASS_LABELS[i]: round(float(proba[i]), 6)
            for i in range(NUM_CLASSES)
        }
        raw_prob_list = [float(p) for p in proba]

        # 4. Risk scoring via Risk Engine
        risk_attack_type = _DISPLAY_TO_RISK_TYPE.get(display, display)
        ctx = RiskContext(
            ai_confidence=confidence,
            ai_attack_type=risk_attack_type,
            rule_match=rule_match,
            source_ip=source_ip or "0.0.0.0",
            target_path=target_path or "/",
        )
        risk_score = risk_engine.compute(ctx)
        risk_level = risk_engine.severity_from_risk(risk_score)

        elapsed_ms = (time.perf_counter() - t_start) * 1000

        logger.info(
            "[ML] Prediction: id=%d | label=%s | confidence=%.4f (%.2f%%) | risk=%d | ms=%.2f",
            class_idx, raw_label, max_prob, confidence, risk_score, elapsed_ms,
        )

        return MLPrediction(
            model_name=MODEL_NAME,
            model_version=MODEL_VERSION,
            model=MODEL_NAME,
            model_status="loaded",
            feature_count=NUM_FEATURES,
            num_features=NUM_FEATURES,
            predicted_class_id=class_idx,
            predicted_class=raw_label,
            raw_label=raw_label,
            prediction=display,
            confidence=round(max_prob, 6),
            probabilities=prob_dict,
            class_probabilities=raw_prob_list,
            is_malicious=malicious and confidence >= 50.0,
            attack_type=display if malicious else "Normal",
            risk_level=risk_level,
            risk_score=risk_score,
            recommendation=_RECOMMENDATION_MAP.get(risk_level, "Monitor event."),
            inference_ms=round(elapsed_ms, 2),
        )

    # ── Fallback results ──────────────────────────────────────────────────

    @staticmethod
    def _unavailable_result() -> MLPrediction:
        return MLPrediction(
            model_name=MODEL_NAME,
            model_version=MODEL_VERSION,
            model=MODEL_NAME,
            model_status=model_loader.status,
            predicted_class_id=-1,
            predicted_class="UNAVAILABLE",
            raw_label="UNAVAILABLE",
            prediction="Model Unavailable",
            confidence=0.0,
            is_malicious=False,
            attack_type="Unknown",
            risk_level="INFO",
            risk_score=0,
            recommendation="ML engine is not loaded. Check model file configuration.",
        )

    @staticmethod
    def _error_result(detail: str) -> MLPrediction:
        return MLPrediction(
            model_name=MODEL_NAME,
            model_version=MODEL_VERSION,
            model=MODEL_NAME,
            model_status="error",
            predicted_class_id=-1,
            predicted_class="ERROR",
            raw_label="ERROR",
            prediction="Prediction Error",
            confidence=0.0,
            is_malicious=False,
            attack_type="Unknown",
            risk_level="INFO",
            risk_score=0,
            recommendation=f"Prediction error: {detail[:200]}",
        )


# Module-level singleton
fanos_predictor = FANOSPredictor.instance()
