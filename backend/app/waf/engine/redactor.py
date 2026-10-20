"""
Sensitive data redaction module for FANOS WAF.
Ensures secrets, authorization headers, session cookies, passwords, and API keys
are never persisted in audit logs or displayed in plaintext in the dashboard.
"""
import json
import re
from typing import Any, Dict, List, Optional

REDACTED_LABEL = "[REDACTED]"

SENSITIVE_HEADER_KEYS = {
    "authorization",
    "proxy-authorization",
    "cookie",
    "set-cookie",
    "x-api-key",
    "x-auth-token",
    "x-access-token",
    "session",
    "token",
}

SENSITIVE_FIELD_NAMES = {
    "password",
    "passwd",
    "pwd",
    "secret",
    "token",
    "access_token",
    "refresh_token",
    "api_key",
    "apikey",
    "client_secret",
    "private_key",
    "credit_card",
    "card_number",
    "cvv",
    "ssn",
}

# Regex to mask inline credentials
SECRET_REGEXES = [
    re.compile(r'(Bearer\s+)[A-Za-z0-9\-._~+/]+=*', re.IGNORECASE),
    re.compile(r'(Basic\s+)[A-Za-z0-9+/]+=*', re.IGNORECASE),
]


class SafeRedactor:
    """Sanitizes headers, parameters, and bodies before logging or storing."""

    @staticmethod
    def redact_headers(headers: Dict[str, str]) -> Dict[str, str]:
        """Redacts sensitive HTTP headers."""
        sanitized = {}
        for k, v in headers.items():
            lower_k = k.lower().strip()
            if lower_k in SENSITIVE_HEADER_KEYS or any(s in lower_k for s in ["auth", "cookie", "token", "key"]):
                sanitized[k] = REDACTED_LABEL
            else:
                sanitized[k] = v
        return sanitized

    @staticmethod
    def redact_params(params: Dict[str, str]) -> Dict[str, str]:
        """Redacts sensitive query parameters."""
        sanitized = {}
        for k, v in params.items():
            lower_k = k.lower().strip()
            if any(s in lower_k for s in SENSITIVE_FIELD_NAMES):
                sanitized[k] = REDACTED_LABEL
            else:
                sanitized[k] = v
        return sanitized

    @classmethod
    def redact_body(cls, body: Optional[str]) -> str:
        """
        Redacts sensitive JSON fields or inline patterns in request bodies.
        """
        if not body:
            return ""

        # Try parsing as JSON first
        try:
            data = json.loads(body)
            if isinstance(data, dict):
                sanitized_dict = cls._redact_dict(data)
                return json.dumps(sanitized_dict)
        except Exception:
            pass

        # Text masking for common key-value formats
        sanitized_text = body
        for secret_name in SENSITIVE_FIELD_NAMES:
            pattern = re.compile(
                rf'("{secret_name}"\s*:\s*")[^"]+(")',
                re.IGNORECASE
            )
            sanitized_text = pattern.sub(rf'\1{REDACTED_LABEL}\2', sanitized_text)

            # URL encoded: secret_name=val
            url_pattern = re.compile(
                rf'({secret_name}=)([^&]+)',
                re.IGNORECASE
            )
            sanitized_text = url_pattern.sub(rf'\1{REDACTED_LABEL}', sanitized_text)

        for regex in SECRET_REGEXES:
            sanitized_text = regex.sub(rf'\1{REDACTED_LABEL}', sanitized_text)

        return sanitized_text

    @classmethod
    def _redact_dict(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively redacts dictionary fields."""
        sanitized = {}
        for k, v in data.items():
            lower_k = str(k).lower().strip()
            if any(s in lower_k for s in SENSITIVE_FIELD_NAMES):
                sanitized[k] = REDACTED_LABEL
            elif isinstance(v, dict):
                sanitized[k] = cls._redact_dict(v)
            elif isinstance(v, list):
                sanitized[k] = [cls._redact_dict(item) if isinstance(item, dict) else item for item in v]
            else:
                sanitized[k] = v
        return sanitized

    @classmethod
    def redact_evidence(cls, matched_value: str) -> str:
        """Bounds and sanitizes evidence string shown in findings."""
        if not matched_value:
            return ""
        # Cap length to 200 chars for safe presentation
        capped = matched_value[:200]
        for regex in SECRET_REGEXES:
            capped = regex.sub(rf'\1{REDACTED_LABEL}', capped)
        return capped


redactor = SafeRedactor()
