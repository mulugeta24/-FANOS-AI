"""
SQL Injection Detection Module.
Deterministic, ReDoS-safe checks for SQL injection attack patterns.
Avoids false positives on regular words like 'select', 'table', 'or'.
"""
import re
from typing import Dict, List, Optional
from app.waf.rules.models import WAFRule
from app.waf.schemas.inspect import Finding

# Pre-compiled linear-time regular expressions
UNION_PATTERN = re.compile(r"\bunion\s+(?:all\s+)?select\b", re.IGNORECASE)

TAUTOLOGY_PATTERNS = [
    re.compile(r"\b(?:or|and)\s+['\"]?(\d+)['\"]?\s*=\s*['\"]?\1['\"]?", re.IGNORECASE),
    re.compile(r"\b(?:or|and)\s+['\"]([a-zA-Z0-9_-]+)['\"]\s*=\s*['\"]\1['\"]", re.IGNORECASE),
    re.compile(r"\b(?:or|and)\s+true\b", re.IGNORECASE),
    re.compile(r"['\"]\s+(?:or|and)\s+['\"][^'\"]*['\"]\s*=\s*['\"][^'\"]*['\"]", re.IGNORECASE),
    re.compile(r"['\"]\s*(?:or|and)\s*1\s*=\s*1", re.IGNORECASE),
]

COMMENT_PATTERNS = [
    re.compile(r"(?:'|\"|\d)\s*--(?:\s+.*)?$", re.IGNORECASE),
    re.compile(r"/\*.*?\*/", re.DOTALL),
]

TIME_DELAY_PATTERN = re.compile(
    r"\b(?:sleep\s*\(\s*\d+\s*\)|benchmark\s*\(\s*\d+\s*,|pg_sleep\s*\(\s*\d+\s*\)|waitfor\s+delay\s+['\"]\d+:\d+:\d+['\"])",
    re.IGNORECASE
)

STACKED_DANGEROUS_PATTERN = re.compile(
    r"(?:;\s*(?:drop\s+table|truncate\s+table|alter\s+table|shutdown)\b|\b(?:exec|execute)\s+(?:xp_cmdshell|sp_executesql)\b)",
    re.IGNORECASE
)

ERROR_BASED_PATTERN = re.compile(
    r"(?:\b(?:extractvalue|updatexml)\s*\(|\binformation_schema\.(?:tables|columns|schemata)\b|\b(?:sys\.databases|sys\.tables)\b|\bconcat_ws\s*\(|\bchar\(\d+(?:,\d+)*\)|\b(?:ctxsys\.drithsx\.sn|utl_inaddr\.get_host_name|utl_http\.request)\b)",
    re.IGNORECASE,
)


class SQLiDetector:
    """Detects SQL Injection vectors in query parameters and body."""

    def detect(
        self,
        rule: WAFRule,
        path: str,
        query_params: Dict[str, str],
        headers: Dict[str, str],
        body: str,
    ) -> List[Finding]:
        findings: List[Finding] = []

        # Target inspection locations
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

            if rule.id == "FW-SQLI-001":
                m = UNION_PATTERN.search(text)
                if m:
                    match_found = True
                    matched_snippet = m.group(0)

            elif rule.id == "FW-SQLI-002":
                for pat in TAUTOLOGY_PATTERNS:
                    m = pat.search(text)
                    if m:
                        match_found = True
                        matched_snippet = m.group(0)
                        break

            elif rule.id == "FW-SQLI-003":
                for pat in COMMENT_PATTERNS:
                    m = pat.search(text)
                    if m:
                        match_found = True
                        matched_snippet = m.group(0)
                        break

            elif rule.id == "FW-SQLI-004":
                m = TIME_DELAY_PATTERN.search(text)
                if m:
                    match_found = True
                    matched_snippet = m.group(0)

            elif rule.id == "FW-SQLI-005":
                m = STACKED_DANGEROUS_PATTERN.search(text)
                if m:
                    match_found = True
                    matched_snippet = m.group(0)

            elif rule.id == "FW-SQLI-006":
                m = ERROR_BASED_PATTERN.search(text)
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


sqli_detector = SQLiDetector()
