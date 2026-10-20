"""
NoSQL & LDAP Injection Detection Module.
Detects document store query manipulation (MongoDB operator injection) and directory service
filter injection (LDAP boolean metacharacter tampering).
"""
import re
from typing import Dict, List, Tuple
from app.waf.rules.models import WAFRule
from app.waf.schemas.inspect import Finding

# MongoDB NoSQL injection operators
NOSQL_PATTERNS = [
    re.compile(r"['\"]?\$(?:gt|gte|lt|lte|ne|nin|in|exists|regex|where|expr|jsonSchema)['\"]?\s*:", re.IGNORECASE),
    re.compile(r"\[\$(?:gt|gte|lt|lte|ne|nin|in|exists|regex|where)\]", re.IGNORECASE),
    re.compile(r"(?:\$where\s*:\s*['\"][^'\"]*this\.[^'\"]*['\"])", re.IGNORECASE),
]

# LDAP injection patterns
LDAP_PATTERNS = [
    re.compile(r"\([&|!]\s*\([a-zA-Z0-9_-]+\s*=\s*\*?\s*\)\s*\([a-zA-Z0-9_-]+\s*=\s*\*?\s*\)\)", re.IGNORECASE),
    re.compile(r"\*\)\s*\([a-zA-Z0-9_-]+\s*=\s*\*?", re.IGNORECASE),
    re.compile(r"\b(?:uid|cn|mail|userPassword|samaccountname)\s*=\s*\*\s*\)", re.IGNORECASE),
]


class NoSQLAndLDAPDetector:
    """Detects NoSQL (MongoDB) and LDAP directory injection vectors."""

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
        if "query" in rule.target_locations:
            for k, v in query_params.items():
                targets.append((f"query:{k}", f"{k}={v}"))
        if "body" in rule.target_locations and body:
            targets.append(("body", body))
        if "path" in rule.target_locations and path:
            targets.append(("path", path))

        for location, text in targets:
            if not text:
                continue

            if rule.id == "FW-NOSQL-001":
                for pattern in NOSQL_PATTERNS:
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
                                description=f"NoSQL (MongoDB) operator injection detected: '{match.group(0)}'",
                            )
                        )
                        break
            elif rule.id == "FW-LDAP-001":
                for pattern in LDAP_PATTERNS:
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
                                description=f"LDAP directory filter injection detected: '{match.group(0)}'",
                            )
                        )
                        break

        return findings


nosql_ldap_detector = NoSQLAndLDAPDetector()
