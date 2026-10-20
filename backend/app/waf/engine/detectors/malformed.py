"""
Malformed HTTP and Protocol Smuggling Detection Module.
Detects CRLF header splitting, null-byte evasion, and malformed components.
"""
import re
from typing import Dict, List
from app.waf.rules.models import WAFRule
from app.waf.schemas.inspect import Finding

CRLF_PATTERN = re.compile(r"(?:%0d%0a|%0a%0d|(?:\r\n|\n\r|\r|\n)(?=[a-zA-Z0-9_-]+:))", re.IGNORECASE)
NULL_BYTE_PATTERN = re.compile(r"(?:%00|\x00)", re.IGNORECASE)


class MalformedRequestDetector:
    """Detects protocol anomalies, CRLF injection, and null byte evasions."""

    def detect(
        self,
        rule: WAFRule,
        raw_path: str,
        raw_query_params: Dict[str, str],
        raw_headers: Dict[str, str],
        raw_body: str,
    ) -> List[Finding]:
        findings: List[Finding] = []

        targets: List[tuple[str, str]] = []
        if "path" in rule.target_locations and raw_path:
            targets.append(("path", raw_path))
        if "query" in rule.target_locations:
            for k, v in raw_query_params.items():
                targets.append((f"query:{k}", v))
        if "headers" in rule.target_locations:
            for k, v in raw_headers.items():
                targets.append((f"header:{k}", v))
        if "body" in rule.target_locations and raw_body:
            targets.append(("body", raw_body))

        for location, text in targets:
            if not text:
                continue

            match_found = False
            matched_snippet = ""

            if rule.id == "FW-MAL-001":
                m = CRLF_PATTERN.search(text)
                if m:
                    match_found = True
                    matched_snippet = m.group(0)

            elif rule.id == "FW-MAL-002":
                m = NULL_BYTE_PATTERN.search(text)
                if m:
                    match_found = True
                    matched_snippet = m.group(0)

            if match_found:
                findings.append(
                    Finding(
                        rule_id=rule.id,
                        rule_name=rule.name,
                        category=rule.category,
                        severity=rule.severity,
                        action=rule.action,
                        location=location,
                        matched_value=matched_snippet[:60],
                        description=rule.description,
                    )
                )

        return findings


malformed_detector = MalformedRequestDetector()
