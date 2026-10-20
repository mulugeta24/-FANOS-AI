"""
Mass Assignment & Privilege Escalation Detection Module.
Detects parameter tampering and JSON payloads attempting unauthorized role or privilege elevation.
"""
import re
from typing import Dict, List, Tuple
from app.waf.rules.models import WAFRule
from app.waf.schemas.inspect import Finding

# Dangerous administrative role assignment values
ADMIN_ROLES = {"admin", "administrator", "root", "superuser", "superadmin", "system", "sysadmin"}

# Regex for JSON or form body role elevation:
# e.g., "role": "admin", "isAdmin": true, "is_admin": 1, "is_superuser": true
BODY_PRIVILEGE_PATTERN = re.compile(
    r"""(?:['"]?(?:is_?admin|is_?superuser|is_?staff|is_?root|account_?role|user_?role|role|privilege|user_?type)['"]?\s*[:=]\s*(?:['"]?(?:admin|root|superuser|administrator|system)['"]?|true|1))\b""",
    re.IGNORECASE,
)

# JSON array permissions elevation: "permissions": ["*", "admin", "all"]
PERMISSIONS_ELEVATION_PATTERN = re.compile(
    r"""['"]?permissions['"]?\s*[:=]\s*\[?\s*['"]?(?:\*|all|admin|superuser|write:all|root)['"]?""",
    re.IGNORECASE,
)


class PrivilegeEscalationDetector:
    """Detects Mass Assignment and Privilege Escalation vectors in query and body."""

    def detect(
        self,
        rule: WAFRule,
        path: str,
        query_params: Dict[str, str],
        headers: Dict[str, str],
        body: str,
    ) -> List[Finding]:
        findings: List[Finding] = []

        # 1. Inspect query parameters
        if "query" in rule.target_locations:
            for k, v in query_params.items():
                lower_k = k.lower().strip()
                lower_v = v.lower().strip()
                if lower_k in ("role", "user_role", "user_type", "account_role", "privilege"):
                    if lower_v in ADMIN_ROLES:
                        findings.append(
                            Finding(
                                rule_id=rule.id,
                                rule_name=rule.name,
                                category=rule.category,
                                severity=rule.severity,
                                action=rule.action,
                                location=f"query:{k}",
                                matched_value=f"{k}={v}",
                                description=f"Mass assignment privilege escalation parameter '{k}={v}' detected.",
                            )
                        )
                elif lower_k in ("isadmin", "is_admin", "is_superuser", "is_staff", "is_root"):
                    if lower_v in ("1", "true", "yes"):
                        findings.append(
                            Finding(
                                rule_id=rule.id,
                                rule_name=rule.name,
                                category=rule.category,
                                severity=rule.severity,
                                action=rule.action,
                                location=f"query:{k}",
                                matched_value=f"{k}={v}",
                                description=f"Privilege escalation boolean flag '{k}={v}' detected.",
                            )
                        )

        # 2. Inspect request body (JSON or Form-URLencoded)
        if "body" in rule.target_locations and body:
            m1 = BODY_PRIVILEGE_PATTERN.search(body)
            if m1:
                findings.append(
                    Finding(
                        rule_id=rule.id,
                        rule_name=rule.name,
                        category=rule.category,
                        severity=rule.severity,
                        action=rule.action,
                        location="body",
                        matched_value=m1.group(0)[:80],
                        description=f"Mass assignment payload attempting administrative role elevation: '{m1.group(0)[:80]}'",
                    )
                )
            else:
                m2 = PERMISSIONS_ELEVATION_PATTERN.search(body)
                if m2:
                    findings.append(
                        Finding(
                            rule_id=rule.id,
                            rule_name=rule.name,
                            category=rule.category,
                            severity=rule.severity,
                            action=rule.action,
                            location="body",
                            matched_value=m2.group(0)[:80],
                            description=f"Mass assignment payload attempting wildcard permission elevation: '{m2.group(0)[:80]}'",
                        )
                    )

        return findings


privilege_escalation_detector = PrivilegeEscalationDetector()
