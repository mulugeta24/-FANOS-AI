"""
Malicious File Upload & Web Shell Detection Module.
Detects dangerous executable file uploads, multipart filename manipulation,
double extensions, and embedded web shell signatures.
"""
import re
from typing import Dict, List, Tuple
from app.waf.rules.models import WAFRule
from app.waf.schemas.inspect import Finding

# Dangerous executable extensions in filename or path
DANGEROUS_EXTENSIONS_PATTERN = re.compile(
    r"\.(?:php[3-8]?|phtml|jsp|jspx|asp|aspx|exe|bat|cmd|sh|bash|cgi|pl|py|rb|ps1|vbs|wsf)\b",
    re.IGNORECASE,
)

# Multipart filename parameter check
FILENAME_PATTERN = re.compile(
    r'filename\s*=\s*["\']?[^"\']*\.(?:php[3-8]?|phtml|jsp|jspx|asp|aspx|exe|bat|cmd|sh|bash|cgi|pl|py|rb|ps1|vbs|wsf)["\']?',
    re.IGNORECASE,
)

# Double extension evasion: shell.php.jpg, payload.phtml.png, etc.
DOUBLE_EXTENSION_PATTERN = re.compile(
    r"\.(?:php[3-8]?|phtml|jsp|jspx|asp|aspx|exe|sh|pl|cgi)\.(?:jpg|jpeg|png|gif|txt|pdf|doc|docx|csv)\b",
    re.IGNORECASE,
)

# Embedded web shell execution code
WEBSHELL_PAYLOAD_PATTERNS = [
    re.compile(r"<\?php.*?(?:eval|system|passthru|shell_exec|exec|popen|proc_open)\s*\(", re.IGNORECASE | re.DOTALL),
    re.compile(r"<\?=\s*(?:`[^`]+`|\$_(?:GET|POST|REQUEST|COOKIE)\[)", re.IGNORECASE),
    re.compile(r"eval\s*\(\s*(?:base64_decode|gzinflate|str_rot13)\s*\(", re.IGNORECASE),
    re.compile(r"Runtime\.getRuntime\(\)\.exec\(", re.IGNORECASE),
    re.compile(r"ProcessBuilder\s*\(", re.IGNORECASE),
]


class FileUploadDetector:
    """Detects malicious file uploads, executable extensions, and web shell payloads."""

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
        if "body" in rule.target_locations and body:
            targets.append(("body", body))
        if "query" in rule.target_locations:
            for k, v in query_params.items():
                targets.append((f"query:{k}", f"{k}={v}"))
        if "path" in rule.target_locations and path:
            targets.append(("path", path))

        for location, text in targets:
            if not text:
                continue

            if rule.id == "FW-UPL-001":
                # Check for multipart filename attribute or file path extension
                fn_match = FILENAME_PATTERN.search(text) or DANGEROUS_EXTENSIONS_PATTERN.search(text)
                if fn_match:
                    findings.append(
                        Finding(
                            rule_id=rule.id,
                            rule_name=rule.name,
                            category=rule.category,
                            severity=rule.severity,
                            action=rule.action,
                            location=location,
                            matched_value=fn_match.group(0),
                            description=f"Dangerous executable script extension detected in upload/path: '{fn_match.group(0)}'",
                        )
                    )
            elif rule.id == "FW-UPL-002":
                for pattern in WEBSHELL_PAYLOAD_PATTERNS:
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
                                matched_value=match.group(0)[:60],
                                description=f"Malicious web shell code execution signature detected: '{match.group(0)[:60]}'",
                            )
                        )
                        break
            elif rule.id == "FW-UPL-003":
                match_double = DOUBLE_EXTENSION_PATTERN.search(text)
                if match_double:
                    findings.append(
                        Finding(
                            rule_id=rule.id,
                            rule_name=rule.name,
                            category=rule.category,
                            severity=rule.severity,
                            action=rule.action,
                            location=location,
                            matched_value=match_double.group(0),
                            description=f"Double extension evasion detected in upload/path: '{match_double.group(0)}'",
                        )
                    )

        return findings


file_upload_detector = FileUploadDetector()
