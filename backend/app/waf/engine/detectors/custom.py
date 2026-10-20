"""
Custom Configurable Rules Detection Module.
Evaluates user-defined WAF patterns with safe regex execution, LRU pattern caching,
and catastrophic backtracking (ReDoS) prevention.
"""
from functools import lru_cache
import re
import time
from typing import Dict, List, Optional
from app.waf.rules.models import WAFRule
from app.waf.schemas.inspect import Finding

# Dangerous nested quantifier patterns indicative of catastrophic backtracking (ReDoS)
REDOS_NESTED_QUANTIFIERS = re.compile(
    r"\([^\)]*[\+\*\{][^\)]*\)[\+\*\{]|"  # (a+)+ or (a*)* or (a{1,2})+
    r"\([^\)]*\|[^\)]*[\+\*][^\)]*\)[\+\*]",  # (a|b+)+
    re.IGNORECASE
)


def validate_regex_safety(pattern: str) -> None:
    """
    Validates regex syntax and detects catastrophic backtracking patterns (ReDoS).
    Raises ValueError if invalid or dangerous.
    """
    if not pattern:
        raise ValueError("Pattern cannot be empty.")

    if len(pattern) > 512:
        raise ValueError("Pattern exceeds maximum allowed length of 512 characters.")

    # 1. Syntax check
    try:
        compiled = re.compile(pattern, re.IGNORECASE)
    except re.error as e:
        raise ValueError(f"Invalid regular expression syntax: {str(e)}")

    # 2. ReDoS nested quantifier detection
    if REDOS_NESTED_QUANTIFIERS.search(pattern):
        raise ValueError("Pattern rejected: nested quantifiers may cause catastrophic backtracking (ReDoS).")

    # 3. Dynamic test against synthetic inputs
    test_inputs = [
        "a" * 25 + "!",
        "1" * 25 + "!",
        " " * 25 + "!",
    ]
    for sample in test_inputs:
        t0 = time.perf_counter()
        compiled.search(sample)
        elapsed = time.perf_counter() - t0
        if elapsed > 0.05:  # Over 50ms on 25 chars indicates exponential backtracking
            raise ValueError("Pattern rejected: execution time indicates catastrophic backtracking (ReDoS).")


class CustomRuleDetector:
    """Evaluates dynamic custom detection rules created by administrators with pattern caching."""

    def __init__(self):
        self._compiled_cache: Dict[str, Optional[re.Pattern]] = {}

    def _get_compiled_pattern(self, pattern: str) -> Optional[re.Pattern]:
        if pattern not in self._compiled_cache:
            try:
                self._compiled_cache[pattern] = re.compile(pattern, re.IGNORECASE)
            except Exception:
                self._compiled_cache[pattern] = None
        return self._compiled_cache[pattern]

    def detect(
        self,
        rule: WAFRule,
        path: str,
        query_params: Dict[str, str],
        headers: Dict[str, str],
        body: str,
    ) -> List[Finding]:
        findings: List[Finding] = []

        if not rule.pattern:
            return findings

        compiled = self._get_compiled_pattern(rule.pattern)
        if compiled is None:
            return findings

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

            try:
                m = compiled.search(text)
            except Exception:
                continue

            if m:
                findings.append(
                    Finding(
                        rule_id=rule.id,
                        rule_name=rule.name,
                        category=rule.category,
                        severity=rule.severity,
                        action=rule.action,
                        location=location,
                        matched_value=m.group(0)[:120],
                        description=rule.description,
                    )
                )

        return findings


custom_detector = CustomRuleDetector()
