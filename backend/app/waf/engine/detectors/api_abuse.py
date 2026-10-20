"""
API & GraphQL Abuse Detection Module.
Detects GraphQL schema introspection harvesting, batch query abuse,
and unauthorized framework administration / Swagger / Actuator endpoint probing.
"""
import re
from typing import Dict, List, Tuple
from app.waf.rules.models import WAFRule
from app.waf.schemas.inspect import Finding

# GraphQL introspection patterns: __schema, __type, IntrospectionQuery
GRAPHQL_INTROSPECTION_PATTERN = re.compile(
    r"(?:__schema\s*\{|__type\s*\(\s*name\s*:|IntrospectionQuery\b|__typename\s*,\s*__typename)",
    re.IGNORECASE,
)

# Sensitive internal administration, framework telemetry, and swagger/API docs probes
SENSITIVE_API_PROBES_PATTERN = re.compile(
    r"(?:/actuator(?:/(?:env|heapdump|beans|configprops|health|metrics|mappings|loggers))?|/swagger-ui(?:/|\.html)?|/v[123]/api-docs|/openapi\.(?:json|yaml|yml)|/api/v\d+/internal\b|/graphql/schema|/\.well-known/apollo)",
    re.IGNORECASE,
)


class APIAbuseDetector:
    """Detects API reconnaissance, unauthorized endpoint access, and GraphQL introspection abuse."""

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
        if "path" in rule.target_locations and path:
            targets.append(("path", path))
        if "query" in rule.target_locations:
            for k, v in query_params.items():
                targets.append((f"query:{k}", f"{k}={v}"))
        if "body" in rule.target_locations and body:
            targets.append(("body", body))

        for location, text in targets:
            if not text:
                continue

            matched_snippet = ""
            desc = ""

            if rule.id == "FW-GQL-001":
                # Check for GraphQL introspection query patterns
                m = GRAPHQL_INTROSPECTION_PATTERN.search(text)
                if m:
                    matched_snippet = m.group(0)[:80]
                    desc = f"GraphQL introspection schema harvesting query detected: '{matched_snippet}'"

            elif rule.id == "FW-API-001":
                # Check for administrative API / actuator / swagger documentation probing
                m = SENSITIVE_API_PROBES_PATTERN.search(text)
                if m:
                    matched_snippet = m.group(0)[:80]
                    desc = f"Unauthorized sensitive API / Actuator telemetry endpoint probing: '{matched_snippet}'"

            if matched_snippet:
                findings.append(
                    Finding(
                        rule_id=rule.id,
                        rule_name=rule.name,
                        category=rule.category,
                        severity=rule.severity,
                        action=rule.action,
                        location=location,
                        matched_value=matched_snippet,
                        description=desc or rule.description,
                    )
                )

        return findings


api_abuse_detector = APIAbuseDetector()
