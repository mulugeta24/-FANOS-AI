"""
AI Engine API — predictions, model status, rule engine.
"""
from __future__ import annotations

from typing import Optional, Dict
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.ai.engine import ai_engine
from app.ai.predictor import fanos_predictor
from app.ai.rule_engine import rule_engine
from app.schemas.security import (
    PredictionRequest,
    PredictionResponse,
)

router = APIRouter(prefix="/ai", tags=["AI Intelligence"])


class MLPredictionResponse(BaseModel):
    """Canonical FANOS V3 prediction response containing model metadata and probabilities."""
    predicted_class_id: int
    predicted_class:    str
    confidence:         float
    model_name:         str
    model_version:      str
    feature_count:      int
    model:              str
    model_status:       str
    prediction:         str
    probabilities:      Dict[str, float]
    is_malicious:       bool
    attack_type:        str
    risk_level:         str
    risk_score:         int
    recommendation:     str
    inference_ms:       float
    num_features:       int
    # Rule engine fields
    rule_triggered:     Optional[str] = None
    rule_action:        Optional[str] = None


@router.get("/engine/status")
async def get_engine_status() -> dict:
    """Return current AI engine status and metrics."""
    return ai_engine.get_status()


@router.post("/predict", response_model=PredictionResponse)
async def predict(body: PredictionRequest) -> PredictionResponse:
    """
    Run AI inference on a feature vector.

    The feature vector must contain exactly 70 float values representing
    canonical FANOS V3 network flow characteristics.
    """
    if len(body.features) != 70:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Feature vector length mismatch: expected exactly 70 features, got {len(body.features)}.",
        )

    # 1. Rule engine first (lower latency for known signatures)
    rule_match = None
    if body.target:
        rule_match = rule_engine.evaluate(body.target)

    # 2. Run real XGBoost 16D_CHAMPION model via predictor
    ml = fanos_predictor.predict_features(
        features=body.features,
        source_ip=body.source_ip,
        target_path=body.target,
        rule_match=rule_match,
    )

    if ml.model_status == "error":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI model inference failed: {ml.recommendation}",
        )

    # 3. Rule override: if rule fires with higher confidence, use its label
    attack_type = ml.attack_type
    if rule_match and rule_match.confidence > (ml.confidence * 100.0 if ml.confidence <= 1.0 else ml.confidence):
        attack_type = rule_match.attack_type

    attack_detected = ml.is_malicious or (rule_match is not None)
    max_confidence = max(
        ml.confidence * 100.0 if ml.confidence <= 1.0 else ml.confidence,
        rule_match.confidence if rule_match else 0.0
    )

    return PredictionResponse(
        attack_detected=attack_detected,
        attack_type=attack_type,
        confidence=round(max_confidence, 2),
        risk_score=ml.risk_score,
        severity=ml.risk_level,
        recommendation=ml.recommendation,
    )


@router.post("/predict/full", response_model=MLPredictionResponse)
async def predict_full(body: PredictionRequest) -> MLPredictionResponse:
    """
    Canonical FANOS V3 prediction endpoint — returns exact Class_ID, model metadata, and full details.
    """
    if len(body.features) != 70:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Feature vector length mismatch: expected exactly 70 features, got {len(body.features)}.",
        )

    rule_match = None
    if body.target:
        rule_match = rule_engine.evaluate(body.target)

    ml = fanos_predictor.predict_features(
        features=body.features,
        source_ip=body.source_ip,
        target_path=body.target,
        rule_match=rule_match,
    )

    if ml.model_status == "error":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI model inference failed: {ml.recommendation}",
        )

    return MLPredictionResponse(
        predicted_class_id=ml.predicted_class_id,
        predicted_class=ml.predicted_class,
        confidence=ml.confidence,
        model_name=ml.model_name,
        model_version=ml.model_version,
        feature_count=ml.feature_count,
        model=ml.model,
        model_status=ml.model_status,
        prediction=ml.prediction,
        probabilities=ml.probabilities,
        is_malicious=ml.is_malicious,
        attack_type=ml.attack_type,
        risk_level=ml.risk_level,
        risk_score=ml.risk_score,
        recommendation=ml.recommendation,
        inference_ms=ml.inference_ms,
        num_features=ml.num_features,
        rule_triggered=rule_match.rule_name if rule_match else None,
        rule_action=rule_match.action if rule_match else None,
    )


@router.post("/predict/event", response_model=MLPredictionResponse)
async def predict_event(event: dict) -> MLPredictionResponse:
    """
    Run prediction directly from a raw Suricata/FANOS event dict.
    Performs feature extraction internally.
    """
    source_ip = event.get("source_ip") or event.get("src_ip") or "0.0.0.0"
    target_path = str(event.get("destination_port") or event.get("dest_port") or "/")

    rule_match = None
    sig = str(event.get("signature", ""))
    if sig:
        rule_match = rule_engine.evaluate(sig)

    ml = fanos_predictor.predict_event(
        event=event,
        source_ip=source_ip,
        target_path=target_path,
        rule_match=rule_match,
    )

    if ml.model_status == "error":
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI model inference failed: {ml.recommendation}",
        )

    return MLPredictionResponse(
        predicted_class_id=ml.predicted_class_id,
        predicted_class=ml.predicted_class,
        confidence=ml.confidence,
        model_name=ml.model_name,
        model_version=ml.model_version,
        feature_count=ml.feature_count,
        model=ml.model,
        model_status=ml.model_status,
        prediction=ml.prediction,
        probabilities=ml.probabilities,
        is_malicious=ml.is_malicious,
        attack_type=ml.attack_type,
        risk_level=ml.risk_level,
        risk_score=ml.risk_score,
        recommendation=ml.recommendation,
        inference_ms=ml.inference_ms,
        num_features=ml.num_features,
        rule_triggered=rule_match.rule_name if rule_match else None,
        rule_action=rule_match.action if rule_match else None,
    )


@router.post("/rule-check")
async def rule_check(payload: str) -> dict:
    """
    Evaluate a raw string payload against the FANOS rule engine.
    Useful for testing WAF bypass attempts.
    """
    matches = rule_engine.evaluate_all(payload)
    return {
        "matched": len(matches) > 0,
        "rules_triggered": [
            {
                "rule_id":     m.rule_id,
                "rule_name":   m.rule_name,
                "attack_type": m.attack_type,
                "confidence":  m.confidence,
                "severity":    m.severity,
                "action":      m.action,
            }
            for m in matches
        ],
    }
