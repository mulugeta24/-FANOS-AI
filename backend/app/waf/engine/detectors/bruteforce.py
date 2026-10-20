"""
Brute Force & Credential Abuse Detection Module.
Detects authentication credential spraying, dictionary attacks, high-risk login targeting,
and rapid credential brute-force attempts.
"""
from collections import defaultdict
import re
import time
from typing import Dict, List, Optional, Tuple
from app.waf.rules.models import WAFRule
from app.waf.schemas.inspect import Finding

# Common authentication and credential endpoints
AUTH_PATH_PATTERN = re.compile(
    r"/(?:login|signin|sign-in|authenticate|auth|token|oauth|session|sessions|admin/login|wp-login\.php|user/login|users/sign_in|api/v1/auth|api/v1/login)\b",
    re.IGNORECASE,
)

# Common credential parameter keys
USER_PARAM_REGEX = re.compile(r"^(?:username|user|uname|email|login|account|identity)$", re.IGNORECASE)
PASS_PARAM_REGEX = re.compile(r"^(?:password|pass|pwd|secret|token|credential)$", re.IGNORECASE)

# Common brute-force / dictionary password patterns
CREDENTIAL_SPRAY_PATTERNS = [
    # Form data: username=...
    re.compile(
        r"(?:username|user|uname|email|login)=(?:admin|root|administrator|guest|test|testuser|user|support|operator|oracle|postgres|master|manager|login|acc|account|temp|default|backup|demo|qa|dev|sysadmin|staff|member)\b",
        re.IGNORECASE,
    ),
    # Form data: password=...
    re.compile(
        r"(?:password|pass|pwd)=(?:admin|root|123456|password|12345678|123456789|1234|toor|qwerty|p@ssw0rd|pass123|pass1234|wrongpassword\w*|wrong\w*|test\w*|welcome\w*|letmein\w*|changeme\w*|default\w*|secret\w*)\b",
        re.IGNORECASE,
    ),
    # JSON: "password": "..."
    re.compile(
        r"['\"](?:password|pass|pwd)['\"]\s*:\s*['\"](?:admin|root|123456|password|12345678|123456789|1234|toor|qwerty|p@ssw0rd|pass123|pass1234|wrongpassword\w*|wrong\w*|test\w*|welcome\w*|letmein\w*|changeme\w*|default\w*|secret\w*)['\"]",
        re.IGNORECASE,
    ),
    # JSON: "username": "..."
    re.compile(
        r"['\"](?:username|user|uname|email|login)['\"]\s*:\s*['\"](?:admin|root|administrator|guest|test|testuser|user|support|operator|oracle|postgres|master|manager|login|acc|account|temp|default|backup|demo|qa|dev|sysadmin|staff|member)['\"]",
        re.IGNORECASE,
    ),
]

# Basic Auth default credentials spray check (admin:admin, root:root, etc.)
BASIC_AUTH_DEFAULT_SPRAY = re.compile(
    r"Basic\s+(?:YWRtaW46YWRtaW4=|cm9vdDpyb290|YWRtaW46cGFzc3dvcmQ=|YWRtaW46MTIzNDU2)",
    re.IGNORECASE,
)


class LoginAttemptTracker:
    """Sliding-window tracker for authentication attempts to detect brute-force flooding."""

    def __init__(self, window_seconds: int = 60, threshold: int = 2, max_keys: int = 10000):
        self.window_seconds = window_seconds
        self.threshold = threshold
        self.max_keys = max_keys
        self._history: Dict[str, List[float]] = defaultdict(list)

    def record_and_check(self, client_ip: str, path: str) -> Tuple[bool, int]:
        now = time.time()
        cutoff = now - self.window_seconds
        key = f"{client_ip}:{path}"

        if key in self._history:
            self._history[key] = [t for t in self._history[key] if t > cutoff]
            if not self._history[key]:
                del self._history[key]

        if len(self._history) >= self.max_keys:
            stale = [k for k, v in self._history.items() if not v or v[-1] <= cutoff]
            for k in stale:
                del self._history[k]

        self._history[key].append(now)
        count = len(self._history[key])
        return (count >= self.threshold, count)

    def reset(self, client_ip: Optional[str] = None):
        if client_ip:
            keys_to_del = [k for k in self._history if k.startswith(f"{client_ip}:")]
            for k in keys_to_del:
                del self._history[k]
        else:
            self._history.clear()


login_attempt_tracker = LoginAttemptTracker(window_seconds=60, threshold=2)


class BruteForceDetector:
    """Detects brute force, credential stuffing, and authentication spray attacks."""

    def detect(
        self,
        rule: WAFRule,
        path: str,
        query_params: Dict[str, str],
        headers: Dict[str, str],
        body: str,
        client_ip: str = "127.0.0.1",
        method: str = "POST",
    ) -> List[Finding]:
        findings: List[Finding] = []

        is_auth_endpoint = bool(AUTH_PATH_PATTERN.search(path))

        # Check if payload contains credential parameters (username/password)
        has_user_param = False
        has_pass_param = False
        if query_params:
            for k in query_params.keys():
                if USER_PARAM_REGEX.match(k):
                    has_user_param = True
                if PASS_PARAM_REGEX.match(k):
                    has_pass_param = True

        if body and not (has_user_param and has_pass_param):
            lower_body = body.lower()
            if any(k in lower_body for k in ("username=", "user=", "uname=", "email=", "login=", '"username"', '"user"')):
                has_user_param = True
            if any(k in lower_body for k in ("password=", "pass=", "pwd=", '"password"', '"pass"')):
                has_pass_param = True

        has_creds = has_user_param and has_pass_param

        # 1. Target check for credential spray / dictionary abuse (FW-BRUTE-001)
        if rule.id == "FW-BRUTE-001":
            # Check body content
            if body:
                for pattern in CREDENTIAL_SPRAY_PATTERNS:
                    match = pattern.search(body)
                    if match:
                        findings.append(
                            Finding(
                                rule_id=rule.id,
                                rule_name=rule.name,
                                category=rule.category,
                                severity=rule.severity,
                                action=rule.action,
                                location="body",
                                matched_value=match.group(0),
                                description=f"Detected credential spray or common dictionary password payload: '{match.group(0)}'",
                            )
                        )
                        break

            # Check query parameters
            if not findings and query_params:
                for k, v in query_params.items():
                    combined = f"{k}={v}"
                    for pattern in CREDENTIAL_SPRAY_PATTERNS:
                        match = pattern.search(combined)
                        if match:
                            findings.append(
                                Finding(
                                    rule_id=rule.id,
                                    rule_name=rule.name,
                                    category=rule.category,
                                    severity=rule.severity,
                                    action=rule.action,
                                    location=f"query:{k}",
                                    matched_value=match.group(0),
                                    description=f"Detected credential spray parameter: '{match.group(0)}'",
                                )
                            )
                            break
                    if findings:
                        break

            # Check Authorization header for common default credential hashes
            auth_header = headers.get("authorization", "")
            if auth_header and BASIC_AUTH_DEFAULT_SPRAY.search(auth_header):
                findings.append(
                    Finding(
                        rule_id=rule.id,
                        rule_name=rule.name,
                        category=rule.category,
                        severity=rule.severity,
                        action=rule.action,
                        location="headers:authorization",
                        matched_value=auth_header[:30],
                        description="Detected Basic Auth default credential spray (admin:admin or root:root).",
                    )
                )

        # 2. Check for high-risk authentication targeting / probe / rapid flooding (FW-BRUTE-002)
        elif rule.id == "FW-BRUTE-002":
            if is_auth_endpoint and (body or query_params or method.upper() == "POST"):
                # Record in sliding window tracker
                is_flood, count = login_attempt_tracker.record_and_check(client_ip, path)

                spray_found = any(
                    pattern.search(body or "") or any(pattern.search(f"{k}={v}") for k, v in query_params.items())
                    for pattern in CREDENTIAL_SPRAY_PATTERNS
                )

                if is_flood:
                    findings.append(
                        Finding(
                            rule_id=rule.id,
                            rule_name=rule.name,
                            category=rule.category,
                            severity=rule.severity,
                            action=rule.action,
                            location="path",
                            matched_value=f"attempt_{count}:{path}",
                            description=f"Rapid authentication brute-force attempt against '{path}' ({count} attempts within 60s from {client_ip})",
                        )
                    )
                elif spray_found or "wp-login.php" in path.lower() or (has_creds and count > 1):
                    findings.append(
                        Finding(
                            rule_id=rule.id,
                            rule_name=rule.name,
                            category=rule.category,
                            severity=rule.severity,
                            action=rule.action,
                            location="path",
                            matched_value=path,
                            description=f"High-risk authentication endpoint targeted by credential spray attack: {path}",
                        )
                    )

        return findings


bruteforce_detector = BruteForceDetector()
