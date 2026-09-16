"""
FANOS Threat Correlation Engine
================================
Groups related security events from the same source IP into
attack chains, detecting multi-stage campaigns.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field
from typing import Dict, List, Optional


CAMPAIGN_THRESHOLD   = 3    # min events to form a campaign
CORRELATION_WINDOW_M = 30   # minutes to look back


@dataclass
class CorrelatedCampaign:
    source_ip:    str
    events:       List[dict]
    attack_types: List[str]
    risk_score:   int
    severity:     str
    chain_label:  str
    detected_at:  datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class CorrelationEngine:
    """
    Groups events by source IP within a rolling time window.
    Escalates to critical campaign when multi-stage pattern is detected.
    """

    MULTI_STAGE_CHAINS = [
        (["Brute Force", "Normal"],           "Credential Brute Force"),
        (["Port Scan", "SQL Injection"],       "Reconnaissance + Exploitation"),
        (["Brute Force", "SQL Injection"],     "Auth Bypass + Data Exfil"),
        (["SSRF", "Command Injection"],        "SSRF to RCE Chain"),
        (["XSS", "CSRF"],                      "Client-Side Attack Chain"),
        (["Path Traversal", "File Upload Attack"], "File Access + Upload Chain"),
    ]

    def correlate(self, events: List[dict]) -> List[CorrelatedCampaign]:
        """
        events: list of dicts with keys:
            source_ip, attack_type, risk_score, severity, created_at (ISO string)
        Returns list of detected CorrelatedCampaigns.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=CORRELATION_WINDOW_M)
        by_ip: Dict[str, List[dict]] = defaultdict(list)

        for ev in events:
            try:
                ts = datetime.fromisoformat(ev["created_at"].replace("Z", "+00:00"))
            except (KeyError, ValueError):
                continue
            if ts >= cutoff:
                by_ip[ev.get("source_ip", "unknown")].append(ev)

        campaigns = []
        for ip, ip_events in by_ip.items():
            if len(ip_events) < CAMPAIGN_THRESHOLD:
                continue

            attack_types = list({e.get("attack_type", "Unknown") for e in ip_events})
            max_risk     = max((e.get("risk_score", 0) for e in ip_events), default=0)
            chain_label  = self._detect_chain(attack_types)
            severity     = self._severity(max_risk)

            campaigns.append(CorrelatedCampaign(
                source_ip=ip,
                events=ip_events,
                attack_types=attack_types,
                risk_score=max_risk,
                severity=severity,
                chain_label=chain_label,
            ))

        return sorted(campaigns, key=lambda c: c.risk_score, reverse=True)

    def _detect_chain(self, attack_types: List[str]) -> str:
        for pattern, label in self.MULTI_STAGE_CHAINS:
            if all(p in attack_types for p in pattern):
                return label
        return "Multi-Stage Attack Campaign"

    @staticmethod
    def _severity(risk: int) -> str:
        if risk >= 90: return "CRITICAL"
        if risk >= 70: return "HIGH"
        if risk >= 50: return "MEDIUM"
        return "LOW"


correlation_engine = CorrelationEngine()
