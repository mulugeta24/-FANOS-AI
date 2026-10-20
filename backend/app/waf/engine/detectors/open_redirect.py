"""
Open Redirect & Phishing Redirection Detection Module.
Detects unvalidated user-controlled redirection parameters attempting to forward users
to untrusted third-party domains or malicious pseudo-protocols.
"""
import re
from typing import Dict, List, Tuple
from app.waf.rules.models import WAFRule
from app.waf.schemas.inspect import Finding

REDIRECT_PARAM_NAMES = {
    "redirect", "redirect_uri", "redirect_url", "url", "next", "return_to",
    "return", "dest", "destination", "target", "goto", "redir", "forward",
    "to", "checkout_url", "continue", "link",
}

# Malicious destination values (absolute external URLs, protocol-relative //, or javascript:)
SUSPICIOUS_REDIRECT_TARGET = re.compile(
    r"^(?:https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|//[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|javascript:|data:)",
    re.IGNORECASE,
)


class OpenRedirectDetector:
    """Detects open redirect vectors in query parameters and body."""

    def detect(
        self,
        rule: WAFRule,
        path: str,
        query_params: Dict[str, str],
        headers: Dict[str, str],
        body: str,
    ) -> List[Finding]:
        findings: List[Finding] = []

        # Check query parameters
        for k, v in query_params.items():
            if k.lower() in REDIRECT_PARAM_NAMES or "redirect" in k.lower() or "return" in k.lower():
                val = v.strip()
                if SUSPICIOUS_REDIRECT_TARGET.search(val):
                    findings.append(
                        Finding(
                            rule_id=rule.id,
                            rule_name=rule.name,
                            category=rule.category,
                            severity=rule.severity,
                            action=rule.action,
                            location=f"query:{k}",
                            matched_value=val[:50],
                            description=f"Open redirect parameter '{k}' pointing to external or dangerous target: '{val[:50]}'",
                        )
                    )

        # Check body if form-encoded or JSON
        if body and any(p in body.lower() for p in ("redirect", "return_to", "next=")):
            for p in REDIRECT_PARAM_NAMES:
                pattern = re.compile(rf"(?:['\"]?{p}['\"]?\s*[:=]\s*['\"]?)(https?://[^'\"&\s]+|//[^'\"&\s]+)", re.IGNORECASE)
                match = pattern.search(body)
                if match:
                    findings.append(
                        Finding(
                            rule_id=rule.id,
                            rule_name=rule.name,
                            category=rule.category,
                            severity=rule.severity,
                            action=rule.action,
                            location="body",
                            matched_value=match.group(1)[:50],
                            description=f"Open redirect target detected in body payload: '{match.group(1)[:50]}'",
                        )
                    )
                    break

        return findings


open_redirect_detector = OpenRedirectDetector()
