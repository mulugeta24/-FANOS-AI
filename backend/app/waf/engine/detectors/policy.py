"""
Security Policy Violations Detection Module.
Identifies automated attack scanners and forbidden file extension probes.
"""
import re
from typing import Dict, List
from app.waf.rules.models import WAFRule
from app.waf.schemas.inspect import Finding

SCANNER_UA_PATTERN = re.compile(
    r"\b(?:sqlmap|nikto|dirbuster|nmap|acunetix|nessus|wpscan|gobuster|masscan|hydra|zaproxy|w3af)\b",
    re.IGNORECASE
)

FORBIDDEN_EXTENSIONS_PATTERN = re.compile(
    r"\.(?:env|git|bak|backup|config|sql|conf|ini|log|swp|htaccess|htpasswd)(?:/|\?|$)",
    re.IGNORECASE
)


class PolicyViolationDetector:
    """Enforces WAF baseline policy rules."""

    def detect(self, rule: WAFRule, path: str, headers: Dict[str, str]) -> List[Finding]:
        findings: List[Finding] = []

        if rule.id == "FW-POL-001":
            user_agent = headers.get("user-agent", "")
            if user_agent:
                m = SCANNER_UA_PATTERN.search(user_agent)
                if m:
                    findings.append(
                        Finding(
                            rule_id=rule.id,
                            rule_name=rule.name,
                            category=rule.category,
                            severity=rule.severity,
                            action=rule.action,
                            location="header:user-agent",
                            matched_value=m.group(0),
                            description=f"Known vulnerability scanner tool '{m.group(0)}' detected.",
                        )
                    )

        elif rule.id == "FW-POL-002" and path:
            m = FORBIDDEN_EXTENSIONS_PATTERN.search(path)
            if m:
                findings.append(
                    Finding(
                        rule_id=rule.id,
                        rule_name=rule.name,
                        category=rule.category,
                        severity=rule.severity,
                        action=rule.action,
                        location="path",
                        matched_value=m.group(0),
                        description=f"Attempt to access restricted extension '{m.group(0)}' prohibited.",
                    )
                )

        return findings


policy_detector = PolicyViolationDetector()
