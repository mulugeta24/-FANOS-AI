"""
Information Disclosure & Sensitive File Reconnaissance Detection Module.
Detects discovery probes targeting cloud credentials, SSH keys, VCS repositories (.git, .svn),
and sensitive server/environment configuration files (.env, wp-config, kube/config).
"""
import re
from typing import Dict, List, Tuple
from app.waf.rules.models import WAFRule
from app.waf.schemas.inspect import Finding

# Secret credentials, private keys, and token files
SECRET_KEYS_PATTERN = re.compile(
    r"(?:/\.aws/(?:credentials|config)|/\.ssh/(?:id_rsa|id_ed25519|id_dsa|authorized_keys|known_hosts)|(?:^|/)(?:id_rsa|id_ed25519|id_dsa|private\.key|server\.key|client_secrets?\.json|service_account(?:_[a-zA-Z0-9]+)?\.json|master\.key)\b)",
    re.IGNORECASE,
)

# VCS repository internals and environment configuration files
VCS_CONFIG_PATTERN = re.compile(
    r"(?:/\.git/(?:HEAD|config|index|logs|COMMIT_EDITMSG)|/\.svn/(?:entries|wc\.db)|/\.env(?:\.(?:local|dev|development|prod|production|backup|example|old))?(?:/|\?|$)|(?:^|/)(?:wp-config\.php|web\.config|docker-compose\.ya?ml|Dockerfile|\.kube/config|kubeconfig|phpinfo\.php|server-status)(?:/|\?|$))",
    re.IGNORECASE,
)


class SensitiveReconDetector:
    """Detects secret reconnaissance and sensitive file disclosure probes."""

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

        for location, text in targets:
            if not text:
                continue

            matched_snippet = ""
            desc = ""

            if rule.id == "FW-RECON-001":
                m = SECRET_KEYS_PATTERN.search(text)
                if m:
                    matched_snippet = m.group(0)
                    desc = f"Secret credential or private key file access probe detected: '{matched_snippet}'"

            elif rule.id == "FW-RECON-002":
                m = VCS_CONFIG_PATTERN.search(text)
                if m:
                    matched_snippet = m.group(0)
                    desc = f"VCS repository or environment configuration file probe detected: '{matched_snippet}'"

            if matched_snippet:
                findings.append(
                    Finding(
                        rule_id=rule.id,
                        rule_name=rule.name,
                        category=rule.category,
                        severity=rule.severity,
                        action=rule.action,
                        location=location,
                        matched_value=matched_snippet[:100],
                        description=desc or rule.description,
                    )
                )

        return findings


recon_detector = SensitiveReconDetector()
