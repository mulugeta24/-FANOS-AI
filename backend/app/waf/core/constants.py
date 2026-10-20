"""
Core constants and enumerations for FANOS WAF.
"""
from enum import Enum


class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class Decision(str, Enum):
    ALLOW = "ALLOW"
    MONITOR = "MONITOR"
    BLOCK = "BLOCK"


class RuleAction(str, Enum):
    BLOCK = "BLOCK"
    MONITOR = "MONITOR"
    LOG = "LOG"
    ALERT = "ALERT"


class WAFMode(str, Enum):
    MONITOR = "monitor"
    BLOCK = "block"
    HYBRID = "hybrid"


# Severity base weights for deterministic risk scoring
SEVERITY_WEIGHTS = {
    Severity.CRITICAL: 40,
    Severity.HIGH: 25,
    Severity.MEDIUM: 15,
    Severity.LOW: 5,
    Severity.INFO: 1,
}

# Default safe limits
DEFAULT_MAX_BODY_SIZE = 1024 * 1024  # 1 MB
DEFAULT_MAX_URI_LENGTH = 2048        # 2 KB
DEFAULT_MAX_HEADER_COUNT = 50
DEFAULT_MAX_HEADER_VALUE_LEN = 4096  # 4 KB
DEFAULT_MAX_QUERY_PARAM_COUNT = 50
DEFAULT_RECURSIVE_DECODE_LIMIT = 5   # Max decode iterations to prevent nested loops
