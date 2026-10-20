"""
Insecure Deserialization & Object Injection Detection Module.
Detects Java serialization streams, PHP object injection, Python pickle / PyYAML payloads,
and .NET TypeNameHandling gadget chains.
"""
import re
from typing import Dict, List, Tuple
from app.waf.rules.models import WAFRule
from app.waf.schemas.inspect import Finding

# Java serialization magic header (Base64 'rO0AB' or hex/escaped \xac\xed\x00\x05)
JAVA_SERIALIZATION_PATTERN = re.compile(
    r"(?:rO0AB[a-zA-Z0-9+/=]{4,}|\xac\xed\x00\x05|\\xac\\xed\\x00\\x05)",
    re.IGNORECASE,
)

# Java / Commons-Collections / ysoserial gadget chains
JAVA_GADGET_PATTERN = re.compile(
    r"(?:org\.apache\.commons\.(?:collections|beanutils)|com\.sun\.org\.apache\.xalan|ysoserial|bsh\.Interpreter|groovy\.util\.Expando|java\.lang\.ProcessBuilder)",
    re.IGNORECASE,
)

# PHP Object Injection serialization pattern: O:4:"User":2:{...}
PHP_DESERIALIZATION_PATTERN = re.compile(
    r"\bO:\d+:\s*\"[a-zA-Z0-9_\\\\]+\":\d+:\s*\{",
    re.IGNORECASE,
)

# Python Pickle opcodes and PyYAML object injection
PYTHON_PICKLE_PYYAML_PATTERN = re.compile(
    r"(?:cposix\s*\nsystem|cos\s*\nsystem|c__builtin__\ngetattr|!!python/object/(?:apply|new):|pickle\.loads\s*\(|__reduce__\s*\()",
    re.IGNORECASE,
)

# .NET dangerous TypeNameHandling deserializers
DOTNET_DESERIALIZATION_PATTERN = re.compile(
    r"(?:TypeNameHandling\s*[:=]\s*['\"]?(?:Auto|All|Objects)|System\.Diagnostics\.Process|ObjectDataProvider|BinaryFormatter)",
    re.IGNORECASE,
)


class InsecureDeserializationDetector:
    """Detects Insecure Deserialization across request body, query parameters, and headers."""

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
        if "headers" in rule.target_locations:
            for hk in ("cookie", "authorization", "x-serialized-data", "x-payload"):
                if hk in headers:
                    targets.append((f"header:{hk}", headers[hk]))

        for location, text in targets:
            if not text:
                continue

            matched_snippet = ""
            desc = ""

            if rule.id == "FW-DESER-001":
                # Check for binary / object serialization stream markers (Java, PHP, Python)
                m_java = JAVA_SERIALIZATION_PATTERN.search(text)
                m_php = PHP_DESERIALIZATION_PATTERN.search(text)
                m_py = PYTHON_PICKLE_PYYAML_PATTERN.search(text)
                m = m_java or m_php or m_py
                if m:
                    matched_snippet = m.group(0)[:80]
                    desc = f"Insecure object serialization stream signature detected: '{matched_snippet}'"

            elif rule.id == "FW-DESER-002":
                # Check for known gadget chains and dangerous reflection payloads (.NET / Java)
                m_gadget = JAVA_GADGET_PATTERN.search(text)
                m_dotnet = DOTNET_DESERIALIZATION_PATTERN.search(text)
                m = m_gadget or m_dotnet
                if m:
                    matched_snippet = m.group(0)[:80]
                    desc = f"Dangerous deserialization gadget chain or type reflection signature detected: '{matched_snippet}'"

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


deserialization_detector = InsecureDeserializationDetector()
