"""
Suspicious HTTP Methods Detection Module.
Detects dangerous, debugging, proxy, and WebDAV methods.
"""
from typing import Dict, List
from app.waf.rules.models import WAFRule
from app.waf.schemas.inspect import Finding

DANGEROUS_METHODS = {
    "TRACE",
    "TRACK",
    "CONNECT",
    "DEBUG",
    "PROPFIND",
    "PROPPATCH",
    "MKCOL",
    "COPY",
    "MOVE",
    "LOCK",
    "UNLOCK",
}


class HTTPMethodsDetector:
    """Detects disallowed or high-risk HTTP request verbs."""

    def detect(self, rule: WAFRule, method: str) -> List[Finding]:
        findings: List[Finding] = []
        clean_method = method.strip().upper()

        if clean_method in DANGEROUS_METHODS:
            findings.append(
                Finding(
                    rule_id=rule.id,
                    rule_name=rule.name,
                    category=rule.category,
                    severity=rule.severity,
                    action=rule.action,
                    location="method",
                    matched_value=clean_method,
                    description=f"HTTP method '{clean_method}' is prohibited by security policy.",
                )
            )

        return findings


methods_detector = HTTPMethodsDetector()
