"""
XML External Entity (XXE) Detection Module.
Detects XML external entity inclusions, DTD manipulations, XML entity expansion,
and local file disclosure via XML parser exploitation.
"""
import re
from typing import Dict, List, Tuple
from app.waf.rules.models import WAFRule
from app.waf.schemas.inspect import Finding

XXE_PATTERNS = [
    re.compile(r"<!ENTITY\s+(?:%\s+)?[a-zA-Z0-9_-]+\s+(?:SYSTEM|PUBLIC)\s+['\"]", re.IGNORECASE),
    re.compile(r"<!DOCTYPE\s+[a-zA-Z0-9_-]+\s*\[", re.IGNORECASE),
    re.compile(r"SYSTEM\s+['\"](?:file|http|https|ftp|expect|php)://", re.IGNORECASE),
    re.compile(r"&(?:[a-zA-Z0-9_-]+);", re.IGNORECASE),
]


class XXEDetector:
    """Detects XXE vectors in request body and query parameters."""

    def detect(
        self,
        rule: WAFRule,
        path: str,
        query_params: Dict[str, str],
        headers: Dict[str, str],
        body: str,
    ) -> List[Finding]:
        findings: List[Finding] = []

        targets: List[Tuple[str, str]] = []
        if "body" in rule.target_locations and body:
            targets.append(("body", body))
        if "query" in rule.target_locations:
            for k, v in query_params.items():
                targets.append((f"query:{k}", v))

        for location, text in targets:
            if not text:
                continue

            for pattern in XXE_PATTERNS:
                match = pattern.search(text)
                if match:
                    findings.append(
                        Finding(
                            rule_id=rule.id,
                            rule_name=rule.name,
                            category=rule.category,
                            severity=rule.severity,
                            action=rule.action,
                            location=location,
                            matched_value=match.group(0),
                            description=f"XML External Entity (XXE) injection signature detected: '{match.group(0)}'",
                        )
                    )
                    break

        return findings


xxe_detector = XXEDetector()
