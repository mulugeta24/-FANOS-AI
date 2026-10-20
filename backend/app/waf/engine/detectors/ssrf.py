"""
Server-Side Request Forgery (SSRF) Detection Module.
Detects attempts to induce backend services to make unintended requests to internal networks,
cloud metadata endpoints, loopback addresses, alternative IP encodings, or forbidden URI schemes.
"""
import re
from typing import Dict, List, Tuple
from app.waf.rules.models import WAFRule
from app.waf.schemas.inspect import Finding

# Cloud metadata endpoints (AWS, GCP, Azure, OpenStack, etc.)
CLOUD_METADATA_PATTERN = re.compile(
    r"(?:169\.254\.169\.254|metadata\.google\.internal|100\.100\.100\.200|fd00:ec2::254|instance-data/latest)",
    re.IGNORECASE,
)

# Internal network and loopback addresses
INTERNAL_NETWORK_PATTERN = re.compile(
    r"(?:https?://|//)(?:(?:127\.\d{1,3}\.\d{1,3}\.\d{1,3})|0\.0\.0\.0|localhost|\[::1\]|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b",
    re.IGNORECASE,
)

# Dangerous alternative protocols
DANGEROUS_SCHEMES_PATTERN = re.compile(
    r"\b(?:gopher|dict|ldap|ldaps|tftp|file)://",
    re.IGNORECASE,
)

# Alternative IP representations (decimal, hex, octal, shortened) and IMDSv2 tokens
ALT_IP_AND_IMDS_PATTERN = re.compile(
    r"(?:https?://(?:2130706433|0x7f[0-9a-f.]*|0177[0-9.]*|127\.1\b|\[(?:0*:)*1\])|/latest/api/token|/latest/meta-data/iam/security-credentials/|/metadata/v1/)",
    re.IGNORECASE,
)


class SSRFDetector:
    """Detects SSRF vectors in URI path, query parameters, headers, and body."""

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
                targets.append((f"query:{k}", v))
        if "body" in rule.target_locations and body:
            targets.append(("body", body))
        if "headers" in rule.target_locations:
            for hk in ("referer", "x-forwarded-host", "x-remote-addr"):
                if hk in headers:
                    targets.append((f"header:{hk}", headers[hk]))

        for location, text in targets:
            if not text:
                continue

            if rule.id == "FW-SSRF-001":
                match = CLOUD_METADATA_PATTERN.search(text)
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
                            description=f"SSRF attempt targeting cloud instance metadata service: '{match.group(0)}'",
                        )
                    )
            elif rule.id == "FW-SSRF-002":
                match_internal = INTERNAL_NETWORK_PATTERN.search(text)
                match_scheme = DANGEROUS_SCHEMES_PATTERN.search(text)
                matched = match_internal or match_scheme
                if matched:
                    findings.append(
                        Finding(
                            rule_id=rule.id,
                            rule_name=rule.name,
                            category=rule.category,
                            severity=rule.severity,
                            action=rule.action,
                            location=location,
                            matched_value=matched.group(0),
                            description=f"SSRF attempt targeting internal IP/loopback or forbidden protocol: '{matched.group(0)}'",
                        )
                    )
            elif rule.id == "FW-SSRF-003":
                match_alt = ALT_IP_AND_IMDS_PATTERN.search(text)
                if match_alt:
                    findings.append(
                        Finding(
                            rule_id=rule.id,
                            rule_name=rule.name,
                            category=rule.category,
                            severity=rule.severity,
                            action=rule.action,
                            location=location,
                            matched_value=match_alt.group(0),
                            description=f"SSRF alternative IP encoding or IMDSv2 token harvesting detected: '{match_alt.group(0)}'",
                        )
                    )

        return findings


ssrf_detector = SSRFDetector()
