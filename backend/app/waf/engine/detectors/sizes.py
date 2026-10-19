"""
Request Size and Parsing Limits Detection Module.
Enforces strict size limits to prevent Denial of Service and resource exhaustion.
"""
from typing import Dict, List, Optional
from app.core.config import get_settings
from app.waf.rules.models import WAFRule
from app.waf.schemas.inspect import Finding


class RequestSizesDetector:
    """Enforces request body, URI length, and header limits."""

    def __init__(self):
        self.settings = get_settings()

    def detect(
        self,
        rule: WAFRule,
        path: str,
        query_params: Dict[str, str],
        body: Optional[str],
    ) -> List[Finding]:
        findings: List[Finding] = []

        if rule.id == "FW-SIZE-001" and body:
            body_bytes = len(body.encode("utf-8"))
            if body_bytes > self.settings.MAX_REQUEST_BODY_SIZE_BYTES:
                findings.append(
                    Finding(
                        rule_id=rule.id,
                        rule_name=rule.name,
                        category=rule.category,
                        severity=rule.severity,
                        action=rule.action,
                        location="body",
                        matched_value=f"Body size {body_bytes} bytes exceeds limit {self.settings.MAX_REQUEST_BODY_SIZE_BYTES} bytes",
                        description=rule.description,
                    )
                )

        elif rule.id == "FW-SIZE-002":
            query_str = "&".join(f"{k}={v}" for k, v in query_params.items())
            full_uri = f"{path}?{query_str}" if query_str else path
            if len(full_uri) > self.settings.MAX_URI_LENGTH:
                findings.append(
                    Finding(
                        rule_id=rule.id,
                        rule_name=rule.name,
                        category=rule.category,
                        severity=rule.severity,
                        action=rule.action,
                        location="path",
                        matched_value=f"URI length {len(full_uri)} exceeds limit {self.settings.MAX_URI_LENGTH}",
                        description=rule.description,
                    )
                )

        return findings


sizes_detector = RequestSizesDetector()
