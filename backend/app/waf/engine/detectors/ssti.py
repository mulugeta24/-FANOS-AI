"""
Server-Side Template Injection (SSTI) Detection Module.
Detects template engine syntax, sandbox escape sequences, and remote code execution
payloads targeting Jinja2, Twig, Freemarker, Velocity, Smarty, and Pebble.
"""
import re
from typing import Dict, List, Tuple
from app.waf.rules.models import WAFRule
from app.waf.schemas.inspect import Finding

SSTI_PATTERNS = [
    # Jinja2 / Twig expression execution and introspection
    re.compile(r"\{\{.*?(?:config|request|session|self|class|mro|subclasses|import|lipsum|cycler|joiner|namespace|__).*?\}\}", re.IGNORECASE),
    # Mathematical probe expressions commonly used in SSTI verification: {{7*7}}, {{7*'7'}}
    re.compile(r"\{\{\s*\d+\s*[\*+-/]\s*\d+\s*\}\}"),
    # Tag execution blocks: {% import ... %}, {% include ... %}
    re.compile(r"\{%\s*(?:import|include|set|execute|system)\s+.*?%\}", re.IGNORECASE),
    # Java / Freemarker / Spring EL expressions: ${7*7}, ${T(...)}, ${new ...}
    re.compile(r"\$\{\s*(?:T\(|[a-zA-Z0-9_.]+\s*\(|\d+\s*[\*+-/]\s*\d+|new\s+[a-zA-Z0-9_.]+).*?\}", re.IGNORECASE),
    # Ruby / ERB style: <%= 7*7 %>
    re.compile(r"<%=\s*.*?%>"),
    # Python/Ruby dunder methods inside template brackets: __class__, __subclasses__, __globals__
    re.compile(r"(?:\{\{|\$\{|\#\{).*?__(?:class|mro|subclasses|globals|builtins|init)__.*?(?:\}\}|\})", re.IGNORECASE),
]


class SSTIDetector:
    """Detects SSTI vectors across query parameters, path, and request body."""

    def detect(
        self,
        rule: WAFRule,
        path: str,
        query_params: Dict[str, str],
        headers: Dict[str, str],
        body: str,
    ) -> List[Finding]:
        findings: List[Finding] = []

        targets: List[Tuple[str, str]] = []
        if "query" in rule.target_locations:
            for k, v in query_params.items():
                targets.append((f"query:{k}", v))
        if "body" in rule.target_locations and body:
            targets.append(("body", body))
        if "path" in rule.target_locations and path:
            targets.append(("path", path))

        for location, text in targets:
            if not text:
                continue

            for pattern in SSTI_PATTERNS:
                match = pattern.search(text)
                if match:
                    findings.append(
                        Finding(
                            rule_id=rule.id,
                            rule_name=rule.name,
                            category=rule.category,
                            severity=rule.severity,
                            action=rule.action,
                            location=location,
                            matched_value=match.group(0),
                            description=f"Server-Side Template Injection (SSTI) expression detected: '{match.group(0)}'",
                        )
                    )
                    break

        return findings


ssti_detector = SSTIDetector()
