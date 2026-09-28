"""
FANOS WAF Event Model
======================

Normalized security event structure for FANOS WAF.
Provides a common data model that can be consumed by the FANOS backend,
SOC dashboard, correlation engine, and AI/ML pipeline.
"""

import json
import uuid
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from typing import Optional


class RuleSource(str, Enum):
    """Origin of the triggered security rule."""
    OWASP_CRS = "OWASP_CRS"
    FANOS_CUSTOM = "FANOS_CUSTOM"


class EventAction(str, Enum):
    """Action taken by the WAF on the request."""
    ALLOW = "ALLOW"
    BLOCK = "BLOCK"
    LOG = "LOG"


class Severity(str, Enum):
    """Severity classification aligned with FANOS platform conventions."""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


# ── Severity mapping from ModSecurity numeric levels ─────────
#    ModSecurity: 0=EMERGENCY, 1=ALERT, 2=CRITICAL, 3=ERROR,
#                 4=WARNING, 5=NOTICE, 6=INFO, 7=DEBUG
MODSEC_SEVERITY_MAP = {
    "0": Severity.CRITICAL,
    "1": Severity.CRITICAL,
    "2": Severity.CRITICAL,
    "3": Severity.HIGH,
    "4": Severity.MEDIUM,
    "5": Severity.LOW,
    "6": Severity.INFO,
    "7": Severity.INFO,
    "EMERGENCY": Severity.CRITICAL,
    "ALERT": Severity.CRITICAL,
    "CRITICAL": Severity.CRITICAL,
    "ERROR": Severity.HIGH,
    "WARNING": Severity.MEDIUM,
    "NOTICE": Severity.LOW,
    "INFO": Severity.INFO,
    "DEBUG": Severity.INFO,
}

# FANOS custom rule ID range
FANOS_RULE_ID_MIN = 9_500_000
FANOS_RULE_ID_MAX = 9_500_099


def classify_rule_source(rule_id: str) -> RuleSource:
    """Determine whether a rule is OWASP CRS or FANOS custom."""
    try:
        rid = int(rule_id)
        if FANOS_RULE_ID_MIN <= rid <= FANOS_RULE_ID_MAX:
            return RuleSource.FANOS_CUSTOM
    except (ValueError, TypeError):
        pass
    return RuleSource.OWASP_CRS


def map_severity(modsec_severity: str) -> Severity:
    """Map ModSecurity severity value to FANOS severity."""
    return MODSEC_SEVERITY_MAP.get(
        str(modsec_severity).upper(),
        Severity.INFO,
    )


def map_action(modsec_action: str) -> EventAction:
    """Map ModSecurity action to FANOS event action."""
    action_lower = str(modsec_action).lower()
    if "deny" in action_lower or "drop" in action_lower:
        return EventAction.BLOCK
    if "pass" in action_lower or "allow" in action_lower:
        return EventAction.ALLOW
    return EventAction.LOG


@dataclass
class FanosWafEvent:
    """
    Normalized FANOS WAF security event.

    A single event represents one ModSecurity rule match (there may be
    multiple events per HTTP transaction if multiple rules fire).
    """

    # ── Identity ─────────────────────────────────────────────
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    request_id: str = ""

    # ── Request context ──────────────────────────────────────
    source_ip: str = ""
    http_method: str = ""
    request_uri: str = ""
    host: str = ""
    user_agent: str = ""

    # ── Rule match ───────────────────────────────────────────
    rule_id: str = ""
    rule_message: str = ""
    rule_source: str = RuleSource.OWASP_CRS.value
    severity: str = Severity.INFO.value
    anomaly_score: int = 0

    # ── Outcome ──────────────────────────────────────────────
    action: str = EventAction.LOG.value
    status_code: int = 0

    # ── Optional metadata ────────────────────────────────────
    tags: Optional[list] = field(default_factory=list)
    raw_rule_data: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary, omitting None optional fields."""
        d = asdict(self)
        return {k: v for k, v in d.items() if v is not None}

    def to_json(self, indent: int = 2) -> str:
        """Serialize to JSON string."""
        return json.dumps(self.to_dict(), indent=indent, default=str)

    @classmethod
    def from_dict(cls, data: dict) -> "FanosWafEvent":
        """Create a FanosWafEvent from a dictionary."""
        known_fields = {f.name for f in cls.__dataclass_fields__.values()}
        filtered = {k: v for k, v in data.items() if k in known_fields}
        return cls(**filtered)

    def __str__(self) -> str:
        return (
            f"[{self.severity}] {self.rule_source}:{self.rule_id} "
            f"— {self.rule_message} | {self.source_ip} "
            f"{self.http_method} {self.request_uri} → {self.action}"
        )
