"""
FANOS Rule Engine
=================
Deterministic signature-based detection running alongside the AI model.
Rules are evaluated first; if a rule matches with high confidence it
bypasses the AI model for lower latency on well-known attack signatures.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class RuleMatch:
    rule_id:    str
    rule_name:  str
    attack_type: str
    confidence: float
    severity:   str
    action:     str      # BLOCK | ALERT | MONITOR | LOG


# ──────────────────────────────────────────────────────────────
# SQL Injection Patterns
# ──────────────────────────────────────────────────────────────
_SQL_PATTERNS = re.compile(
    r"(\bunion\b.*\bselect\b"
    r"|\bselect\b.*\bfrom\b"
    r"|\bdrop\b.*\btable\b"
    r"|--\s*$"
    r"|;\s*--"
    r"|'\s*or\s*'1'\s*=\s*'1"
    r"|1=1|1 = 1"
    r"|\bexec\b|\bexecute\b"
    r"|xp_cmdshell"
    r"|information_schema)",
    re.IGNORECASE,
)

# ──────────────────────────────────────────────────────────────
# XSS Patterns
# ──────────────────────────────────────────────────────────────
_XSS_PATTERNS = re.compile(
    r"(<script|</script|javascript:|onerror=|onload=|<iframe|<svg|alert\(|document\.cookie)",
    re.IGNORECASE,
)

# ──────────────────────────────────────────────────────────────
# Path Traversal
# ──────────────────────────────────────────────────────────────
_PATH_TRAVERSAL = re.compile(
    r"(\.\./|\.\.\\|%2e%2e%2f|%252e%252e%252f|/etc/passwd|/etc/shadow|/proc/self)",
    re.IGNORECASE,
)

# ──────────────────────────────────────────────────────────────
# SSRF Patterns
# ──────────────────────────────────────────────────────────────
_SSRF_PATTERNS = re.compile(
    r"(169\.254\.169\.254"           # AWS metadata
    r"|metadata\.google\.internal"
    r"|localhost|127\.0\.0\."
    r"|0\.0\.0\.0"
    r"|file://"
    r"|dict://|gopher://)",
    re.IGNORECASE,
)

# ──────────────────────────────────────────────────────────────
# Command Injection
# ──────────────────────────────────────────────────────────────
_CMD_INJECTION = re.compile(
    r"(;\s*\w+|&&|\|\||\$\(|\`"
    r"|/bin/sh|/bin/bash|cmd\.exe"
    r"|ping\s+-c|wget\s+http|curl\s+http"
    r"|nc\s+-e|netcat)",
    re.IGNORECASE,
)


class RuleEngine:
    """
    Evaluates a set of built-in FANOS detection rules against
    incoming HTTP/network payload strings.
    """

    RULES = [
        ("FANOS-SQL-001",  "SQL Injection Signature",   _SQL_PATTERNS,    "SQL Injection",      97.0, "CRITICAL", "BLOCK"),
        ("FANOS-XSS-001",  "XSS Payload Detected",      _XSS_PATTERNS,    "XSS",                93.0, "HIGH",     "BLOCK"),
        ("FANOS-PATH-001", "Path Traversal Attempt",    _PATH_TRAVERSAL,  "Path Traversal",     90.0, "HIGH",     "BLOCK"),
        ("FANOS-SSRF-001", "SSRF Metadata Probe",        _SSRF_PATTERNS,   "SSRF",               92.0, "HIGH",     "BLOCK"),
        ("FANOS-CMD-001",  "Command Injection Attempt", _CMD_INJECTION,   "Command Injection",  98.0, "CRITICAL", "BLOCK"),
    ]

    def evaluate(self, payload: str) -> Optional[RuleMatch]:
        """
        Evaluate payload against all rules.
        Returns first matching RuleMatch, or None if no match.
        """
        for rule_id, rule_name, pattern, attack_type, confidence, severity, action in self.RULES:
            if pattern.search(payload):
                return RuleMatch(
                    rule_id=rule_id,
                    rule_name=rule_name,
                    attack_type=attack_type,
                    confidence=confidence,
                    severity=severity,
                    action=action,
                )
        return None

    def evaluate_all(self, payload: str) -> List[RuleMatch]:
        """
        Evaluate payload against all rules. Returns all matches.
        """
        matches = []
        for rule_id, rule_name, pattern, attack_type, confidence, severity, action in self.RULES:
            if pattern.search(payload):
                matches.append(RuleMatch(
                    rule_id=rule_id,
                    rule_name=rule_name,
                    attack_type=attack_type,
                    confidence=confidence,
                    severity=severity,
                    action=action,
                ))
        return matches

    @staticmethod
    def is_brute_force(
        request_count: int,
        window_seconds: int,
        failure_count: int,
        threshold_rps: int = 20,
        failure_ratio: float = 0.7,
    ) -> Optional[RuleMatch]:
        """
        Brute-force heuristic: high request rate with high failure ratio.
        """
        if window_seconds == 0:
            return None
        rps = request_count / window_seconds
        ratio = failure_count / max(request_count, 1)
        if rps >= threshold_rps and ratio >= failure_ratio:
            return RuleMatch(
                rule_id="FANOS-BF-001",
                rule_name="Brute Force Login Attack",
                attack_type="Brute Force",
                confidence=89.0,
                severity="HIGH",
                action="BLOCK",
            )
        return None

    @staticmethod
    def is_port_scan(
        distinct_ports: int,
        window_seconds: int,
        threshold: int = 20,
    ) -> Optional[RuleMatch]:
        """Port scan: many distinct ports contacted in short window."""
        if distinct_ports >= threshold:
            return RuleMatch(
                rule_id="FANOS-PS-001",
                rule_name="Port Scan Detected",
                attack_type="Port Scan",
                confidence=95.0,
                severity="HIGH",
                action="BLOCK",
            )
        return None


# Module-level singleton
rule_engine = RuleEngine()
