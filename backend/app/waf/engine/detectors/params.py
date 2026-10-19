"""
Query Parameters & Parameter Pollution Detection Module.
Identifies reconnaissance/backdoor query parameters and HTTP Parameter Pollution (HPP).
"""
import re
from typing import Dict, List, Optional
from app.waf.rules.models import WAFRule
from app.waf.schemas.inspect import Finding

SUSPICIOUS_PARAM_NAMES = {"debug", "test", "admin", "cmd", "exec", "shell", "eval", "root", "backdoor"}

# HPP duplicate parameter detection in raw query string e.g. "id=1&id=2" or "user=guest&user=admin"
HPP_PATTERN = re.compile(r"(?:^|[&;])([a-zA-Z0-9_-]+)=[^&;]*[&;].*?\b\1=", re.IGNORECASE)


class QueryParamsDetector:
    """Detects suspicious administrative parameters and HTTP Parameter Pollution (HPP)."""

    def detect(
        self,
        rule: WAFRule,
        query_params: Dict[str, str],
        raw_query: str = "",
    ) -> List[Finding]:
        findings: List[Finding] = []

        if rule.id == "FW-PARM-001":
            for k, v in query_params.items():
                lower_k = k.lower().strip()
                lower_v = v.lower().strip()

                if lower_k in SUSPICIOUS_PARAM_NAMES:
                    if lower_v in {"1", "true", "yes", "on", "enable", "root", "admin"} or lower_k in {"cmd", "exec", "shell", "eval"}:
                        findings.append(
                            Finding(
                                rule_id=rule.id,
                                rule_name=rule.name,
                                category=rule.category,
                                severity=rule.severity,
                                action=rule.action,
                                location=f"query:{k}",
                                matched_value=f"{k}={v}"[:100],
                                description=f"Suspicious control parameter '{k}' detected.",
                            )
                        )

        elif rule.id == "FW-HPP-001":
            # Check for HTTP Parameter Pollution (duplicate conflicting parameter names)
            target = raw_query or "&".join(f"{k}={v}" for k, v in query_params.items())
            m = HPP_PATTERN.search(target)
            if m:
                param_name = m.group(1)
                findings.append(
                    Finding(
                        rule_id=rule.id,
                        rule_name=rule.name,
                        category=rule.category,
                        severity=rule.severity,
                        action=rule.action,
                        location="query",
                        matched_value=m.group(0)[:80],
                        description=f"HTTP Parameter Pollution (HPP) detected on parameter '{param_name}'.",
                    )
                )

        return findings


params_detector = QueryParamsDetector()
