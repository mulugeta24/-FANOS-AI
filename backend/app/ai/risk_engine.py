"""
FANOS Risk Engine
=================
Combines AI confidence, rule match, asset criticality,
and behavioral context into a normalized 0–100 risk score.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from app.ai.rule_engine import RuleMatch


@dataclass
class RiskContext:
    ai_confidence:   float          # 0–100
    ai_attack_type:  str
    rule_match:      Optional[RuleMatch]
    source_ip:       str
    target_path:     str
    method:          str = "GET"
    is_authenticated: bool = False
    asset_criticality: int = 5      # 1–10 scale


class RiskEngine:
    """
    Computes a composite risk score based on multiple signals.

    Formula:
        base_risk   = max(ai_confidence_risk, rule_confidence_risk)
        asset_bonus = (asset_criticality - 5) * 2     (-8 to +10)
        auth_bonus  = +5 if authenticated (lateral movement concern)
        risk        = clamp(base_risk + asset_bonus + auth_bonus, 0, 100)
    """

    # Attack type base weights (same as AI engine for consistency)
    _ATTACK_WEIGHTS = {
        "SQL Injection":      1.0,
        "Command Injection":  1.0,
        "IDOR / BOLA":        0.9,
        "SSRF":               0.9,
        "Brute Force":        0.85,
        "DDoS":               0.8,
        "Path Traversal":     0.8,
        "XSS":                0.75,
        "File Upload Attack": 0.75,
        "Port Scan":          0.6,
        "CSRF":               0.6,
        "Normal":             0.0,
    }

    def compute(self, ctx: RiskContext) -> int:
        # AI-based risk
        w = self._ATTACK_WEIGHTS.get(ctx.ai_attack_type, 0.7)
        ai_risk = int((ctx.ai_confidence / 100.0) * w * 100)

        # Rule-based risk
        rule_risk = 0
        if ctx.rule_match:
            rw = self._ATTACK_WEIGHTS.get(ctx.rule_match.attack_type, 0.7)
            rule_risk = int((ctx.rule_match.confidence / 100.0) * rw * 100)

        base = max(ai_risk, rule_risk)

        # Asset criticality adjustment
        asset_bonus = (ctx.asset_criticality - 5) * 2

        # Authenticated session escalation
        auth_bonus = 5 if ctx.is_authenticated else 0

        # High-value path bonus
        path_bonus = 0
        risky_paths = ["/admin", "/login", "/api/", "/auth", "/dashboard"]
        if any(p in ctx.target_path.lower() for p in risky_paths):
            path_bonus = 5

        final = base + asset_bonus + auth_bonus + path_bonus
        return max(0, min(final, 100))

    @staticmethod
    def severity_from_risk(risk: int) -> str:
        if risk >= 90: return "CRITICAL"
        if risk >= 70: return "HIGH"
        if risk >= 50: return "MEDIUM"
        if risk >= 30: return "LOW"
        return "INFO"


risk_engine = RiskEngine()
