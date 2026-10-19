"""
Deterministic Risk Scoring & Decision Engine for FANOS WAF.
Provides 100% explainable, transparent risk calculation and policy enforcement.
No black-box ML or guessing: decisions are derived strictly from matched rules and configured policies.
"""
from typing import List, Tuple
from app.core.config import get_settings
from app.waf.constants import (
    SEVERITY_WEIGHTS,
    Decision,
    RuleAction,
    Severity,
    WAFMode,
)
from app.waf.schemas.inspect import Finding


class DecisionEngine:
    """Calculates deterministic risk scores and selects enforcement actions."""

    def __init__(self):
        self.settings = get_settings()

    def calculate_risk_score(self, findings: List[Finding]) -> int:
        """
        Calculates a deterministic risk score (0 - 100) based on findings:
        - Critical: 40 pts each (guarantees >= 75)
        - High: 25 pts each (guarantees >= 50)
        - Medium: 15 pts each
        - Low: 5 pts each
        - Info: 1 pt each
        """
        if not findings:
            return 0

        raw_score = 0
        has_critical = False
        has_high = False

        for f in findings:
            weight = SEVERITY_WEIGHTS.get(f.severity, 5)
            raw_score += weight
            if f.severity == Severity.CRITICAL:
                has_critical = True
            elif f.severity == Severity.HIGH:
                has_high = True

        # Ensure baseline minimums based on peak severity
        if has_critical:
            raw_score = max(raw_score, 75)
        elif has_high:
            raw_score = max(raw_score, 50)

        # Cap strictly at 100
        return min(raw_score, 100)

    def evaluate_decision(
        self,
        risk_score: int,
        findings: List[Finding],
        mode_override: str = None,
    ) -> Tuple[Decision, str]:
        """
        Applies security policy to determine whether to ALLOW, MONITOR, or BLOCK.
        Takes into account the operational mode (monitor-only vs active blocking).
        """
        mode = mode_override or self.settings.WAF_MODE

        if not findings or risk_score == 0:
            return Decision.ALLOW, mode

        norm_mode = (mode or "").lower().strip()

        def is_action_block(finding: Finding) -> bool:
            action = getattr(finding, "action", None)
            if action is None:
                return False
            if action == RuleAction.BLOCK or getattr(action, "value", None) == RuleAction.BLOCK.value:
                return True
            s = str(action).upper().strip()
            return s in ("BLOCK", "RULEACTION.BLOCK")

        explicit_block = any(is_action_block(f) for f in findings)
        exceeds_block_threshold = risk_score >= self.settings.BLOCK_THRESHOLD

        if explicit_block or exceeds_block_threshold:
            if norm_mode in (WAFMode.BLOCK.value, WAFMode.HYBRID.value, "hybrid", "both"):
                return Decision.BLOCK, mode
            else:
                # In monitor-only mode, threats are logged and monitored, not blocked
                return Decision.MONITOR, mode

        # Any request that matched security threat findings in monitor or low-risk mode is monitored
        return Decision.MONITOR, mode


decision_engine = DecisionEngine()
