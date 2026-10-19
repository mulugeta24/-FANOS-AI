"""
Logging configuration with safe secret masking for FANOS WAF.
"""
import logging
import sys
import re

SENSITIVE_PATTERNS = [
    re.compile(r'(password|token|secret|api_key|authorization)[\s:=]+([^\s,;&]+)', re.IGNORECASE),
    re.compile(r'(Bearer\s+)[A-Za-z0-9\-._~+/]+=*', re.IGNORECASE),
]


class SanitizingFormatter(logging.Formatter):
    """Formats log records and masks sensitive credentials/tokens."""

    def format(self, record: logging.LogRecord) -> str:
        msg = super().format(record)
        for pattern in SENSITIVE_PATTERNS:
            msg = pattern.sub(r'\1: [REDACTED]', msg)
        return msg


def setup_logging(debug: bool = False) -> logging.Logger:
    level = logging.DEBUG if debug else logging.INFO
    logger = logging.getLogger("fanos_waf")
    logger.setLevel(level)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)
        formatter = SanitizingFormatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger


logger = setup_logging()
