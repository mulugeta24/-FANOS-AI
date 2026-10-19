"""
Command Injection (CMDI) Detection Module.
Deterministic detection of shell operators, command chaining, binary executions,
and interactive reverse shells.
"""
import re
from typing import Dict, List
from app.waf.rules.models import WAFRule
from app.waf.schemas.inspect import Finding

# Shell chaining operator coupled with shell command invocation
CHAINING_PATTERN = re.compile(
    r"(?:(?:;|&&|\|\||\||`)\s*(?:cat|ls|id|whoami|echo|sleep|curl|wget|nc|uname|dir|type|ping|bash|sh|cmd|powershell)\b|\$\([^\)]+\))",
    re.IGNORECASE
)

# Direct binary invocations
BINARY_EXEC_PATTERN = re.compile(
    r"(?:/bin/(?:sh|bash|zsh|dash)|(?:cmd|powershell)(?:\.exe)?\s+/(?:c|k)|\bwhoami\b\s*$|\bcat\s+/etc/|\b(?:curl|wget)\s+https?://)",
    re.IGNORECASE
)

# Reverse shell syntax and encoded payload execution
REVERSE_SHELL_PATTERN = re.compile(
    r"(?:/dev/tcp/[0-9.]+|mkfifo\s+/tmp/|nc\s+-(?:e|c)\s+|sh\s+-i\s*>&|\bpowershell(?:\.exe)?\s+-(?:enc|encodedcommand|e|nop|noni)\b|\bcertutil(?:\.exe)?\s+-urlcache|\bbitsadmin(?:\.exe)?\s+/transfer)",
    re.IGNORECASE
)


class CommandInjectionDetector:
    """Detects OS command injection attempts in query, body, headers."""

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

            if rule.id == "FW-CMD-001":
                m = CHAINING_PATTERN.search(text)
                if m:
                    match_found = True
                    matched_snippet = m.group(0)

            elif rule.id == "FW-CMD-002":
                m = BINARY_EXEC_PATTERN.search(text)
                if m:
                    match_found = True
                    matched_snippet = m.group(0)

            elif rule.id == "FW-CMD-003":
                m = REVERSE_SHELL_PATTERN.search(text)
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


cmdi_detector = CommandInjectionDetector()
