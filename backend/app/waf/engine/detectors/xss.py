"""
Cross-Site Scripting (XSS) Detection Module.
Deterministic, ReDoS-safe checks for stored, reflected, and DOM-based XSS vectors.
"""
import re
from typing import Dict, List
from app.waf.rules.models import WAFRule
from app.waf.schemas.inspect import Finding

SCRIPT_TAG_PATTERN = re.compile(r"<\s*/?\s*script[\s/>]", re.IGNORECASE)

EVENT_HANDLER_PATTERN = re.compile(
    r"\bon(?:load|error|click|mouseover|focus|blur|change|submit|mouseenter|mouseleave|keydown|keyup|pointerdown|animationstart|transitionend)\s*=",
    re.IGNORECASE
)

PSEUDO_PROTOCOL_PATTERN = re.compile(
    r"(?:javascript|vbscript)\s*:\s*|data\s*:\s*text/html",
    re.IGNORECASE
)

VECTOR_TAG_PATTERN = re.compile(
    r"<\s*(?:iframe|object|embed|applet|base)\b|<\s*svg[\s/][^>]*\bon\w+\s*=",
    re.IGNORECASE
)

DOM_SINK_PATTERN = re.compile(
    r"(?:document\.(?:cookie|write|location)|(?:window\.)?location\.(?:href|replace|assign)\s*=|eval\s*\(\s*(?:atob|unescape|decodeURI|decodeURIComponent|location|window)|(?:document\.)?body\.innerHTML\s*=|srcdoc\s*=)",
    re.IGNORECASE
)


class XSSDetector:
    """Detects Cross-Site Scripting attacks in query, body, path, headers."""

    def detect(
        self,
        rule: WAFRule,
        path: str,
        query_params: Dict[str, str],
        headers: Dict[str, str],
        body: str,
    ) -> List[Finding]:
        findings: List[Finding] = []

        targets: List[tuple[str, str]] = []
        if "path" in rule.target_locations and path:
            targets.append(("path", path))
        if "query" in rule.target_locations:
            for k, v in query_params.items():
                targets.append((f"query:{k}", v))
        if "body" in rule.target_locations and body:
            targets.append(("body", body))
        if "headers" in rule.target_locations:
            for k, v in headers.items():
                targets.append((f"header:{k}", v))

        for location, text in targets:
            if not text:
                continue

            match_found = False
            matched_snippet = ""

            if rule.id == "FW-XSS-001":
                m = SCRIPT_TAG_PATTERN.search(text)
                if m:
                    match_found = True
                    matched_snippet = m.group(0)

            elif rule.id == "FW-XSS-002":
                m = EVENT_HANDLER_PATTERN.search(text)
                if m:
                    match_found = True
                    matched_snippet = m.group(0)

            elif rule.id == "FW-XSS-003":
                m = PSEUDO_PROTOCOL_PATTERN.search(text)
                if m:
                    match_found = True
                    matched_snippet = m.group(0)

            elif rule.id == "FW-XSS-004":
                m = VECTOR_TAG_PATTERN.search(text)
                if m:
                    match_found = True
                    matched_snippet = m.group(0)

            elif rule.id == "FW-XSS-005":
                m = DOM_SINK_PATTERN.search(text)
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
                        matched_value=matched_snippet[:120],
                        description=rule.description,
                    )
                )

        return findings


xss_detector = XSSDetector()
