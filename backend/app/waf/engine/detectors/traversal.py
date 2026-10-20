"""
Path Traversal & Local File Inclusion (LFI) Detection Module.
Deterministic detection of directory climbing and system file access.
"""
import re
from typing import Dict, List
from app.waf.rules.models import WAFRule
from app.waf.schemas.inspect import Finding

# Matches ../, ..\, and variants
CLIMBING_PATTERN = re.compile(r"(?:\.\./|\.\.\\|\.\.%2f|\.\.%5c)", re.IGNORECASE)

SENSITIVE_FILES_PATTERN = re.compile(
    r"(?:/etc/(?:passwd|shadow|hosts|issue)|/proc/self/|boot\.ini|win\.ini|windows[/\\]system32|system32[/\\]config)",
    re.IGNORECASE
)


class PathTraversalDetector:
    """Detects path traversal and LFI attempts."""

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

        for location, text in targets:
            if not text:
                continue

            match_found = False
            matched_snippet = ""

            if rule.id == "FW-TRV-001":
                m = CLIMBING_PATTERN.search(text)
                if m:
                    match_found = True
                    matched_snippet = m.group(0)

            elif rule.id == "FW-TRV-002":
                m = SENSITIVE_FILES_PATTERN.search(text)
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


path_traversal_detector = PathTraversalDetector()
