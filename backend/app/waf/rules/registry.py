"""
WAF Rule Registry.
Manages built-in rules and dynamic custom rules.
"""
from typing import Dict, List, Optional
from app.waf.rules.default_rules import DEFAULT_RULES
from app.waf.rules.models import WAFRule


class RuleRegistry:
    """Singleton rule registry for all active WAF rules."""

    _instance: Optional["RuleRegistry"] = None

    def __new__(cls) -> "RuleRegistry":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._rules: Dict[str, WAFRule] = {}
            cls._instance._load_default_rules()
        return cls._instance

    def _load_default_rules(self) -> None:
        """Loads default rules into memory."""
        for rule in DEFAULT_RULES:
            # Create a copy so mutations are isolated
            self._rules[rule.id] = WAFRule(
                id=rule.id,
                name=rule.name,
                category=rule.category,
                severity=rule.severity,
                action=rule.action,
                description=rule.description,
                enabled=rule.enabled,
                is_custom=rule.is_custom,
                pattern=rule.pattern,
                target_locations=list(rule.target_locations),
                tags=list(rule.tags),
            )

    def get_rule(self, rule_id: str) -> Optional[WAFRule]:
        return self._rules.get(rule_id)

    def get_all_rules(self) -> List[WAFRule]:
        return list(self._rules.values())

    def get_enabled_rules(self) -> List[WAFRule]:
        return [r for r in self._rules.values() if r.enabled]

    def add_custom_rule(self, rule: WAFRule) -> WAFRule:
        rule.is_custom = True
        self._rules[rule.id] = rule
        return rule

    def update_rule(self, rule_id: str, **kwargs) -> Optional[WAFRule]:
        rule = self._rules.get(rule_id)
        if not rule:
            return None
        for key, value in kwargs.items():
            if hasattr(rule, key) and value is not None:
                setattr(rule, key, value)
        return rule

    def delete_rule(self, rule_id: str) -> bool:
        """Deletes a custom rule. Built-in rules can only be disabled."""
        rule = self._rules.get(rule_id)
        if not rule or not rule.is_custom:
            return False
        del self._rules[rule_id]
        return True

    def reset_defaults(self) -> None:
        """Resets registry to clean defaults."""
        self._rules.clear()
        self._load_default_rules()


rule_registry = RuleRegistry()
