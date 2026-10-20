"""
WAF Rule model definitions.
"""
from dataclasses import dataclass, field
from typing import Callable, List, Optional
from app.waf.constants import RuleAction, Severity


@dataclass
class WAFRule:
    """A deterministic WAF rule."""
    id: str
    name: str
    category: str
    severity: Severity
    action: RuleAction
    description: str
    enabled: bool = True
    is_custom: bool = False
    pattern: Optional[str] = None  # For custom pattern rules
    target_locations: List[str] = field(default_factory=lambda: ["path", "query", "body", "headers"])
    tags: List[str] = field(default_factory=list)
