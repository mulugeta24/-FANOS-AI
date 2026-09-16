"""
AI Engine API — predictions, model status, rule engine.
"""
from fastapi import APIRouter, HTTPException, status

from app.ai.engine import ai_engine
from app.ai.rule_engine import rule_engine
from app.ai.risk_engine import risk_engine, RiskContext
from app.schemas.security import (
    AIEngineStatus,
    PredictionRequest,
    PredictionResponse,
)

router = APIRouter(prefix="/ai", tags=["AI Intelligence"])


@router.get("/engine/status", response_model=AIEngineStatus)
async def get_engine_status() -> AIEngineStatus:
    """Return current AI engine status and metrics."""
    s = ai_engine.get_status()
    return AIEngineStatus(**s)


@router.post("/predict", response_model=PredictionResponse)
async def predict(body: PredictionRequest) -> PredictionResponse:
    """
    Run AI inference on a feature vector.

    The feature vector should contain 46 normalized float values
    representing network flow characteristics.
    """
    if len(body.features) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Feature vector must not be empty.",
        )

    # 1. Run rule engine first (lower latency for known signatures)
    rule_match = None
    if body.target:
        rule_match = rule_engine.evaluate(body.target)

    # 2. Run AI model
    ai_result = ai_engine.predict(body.features)

    # 3. Compute composite risk
    ctx = RiskContext(
        ai_confidence=ai_result.confidence,
        ai_attack_type=ai_result.attack_type,
        rule_match=rule_match,
        source_ip=body.source_ip or "0.0.0.0",
        target_path=body.target or "/",
    )
    risk = risk_engine.compute(ctx)
    severity = risk_engine.severity_from_risk(risk)

    # 4. Rule match overrides AI if stronger
    attack_type = (
        rule_match.attack_type
        if rule_match and rule_match.confidence > ai_result.confidence
        else ai_result.attack_type
    )

    return PredictionResponse(
        attack_detected=ai_result.attack_detected or rule_match is not None,
        attack_type=attack_type,
        confidence=max(ai_result.confidence, rule_match.confidence if rule_match else 0),
        risk_score=risk,
        severity=severity,
        recommendation=ai_result.recommendation,
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
                "rule_id":    m.rule_id,
                "rule_name":  m.rule_name,
                "attack_type": m.attack_type,
                "confidence": m.confidence,
                "severity":   m.severity,
                "action":     m.action,
            }
            for m in matches
        ],
    }
