"""
VirusTotal Service & Hybrid Detection Engine
============================================
Provides VirusTotal v3 URL threat intelligence and hybrid verdict synthesis.
Includes 24-hour result caching, timeout protection, and graceful fallbacks.
"""
from __future__ import annotations

import os
import time
import base64
from typing import Dict, Any, Optional, Tuple
import httpx

from app.core.config import get_settings
from app.core.logging import log

CACHE_EXPIRY_HOURS = 24

# In-memory fast cache as Tier-0
_MEM_CACHE: Dict[str, Dict[str, Any]] = {}


def _get_url_id(url: str) -> str:
    """Encode URL to VirusTotal base64 identifier."""
    return base64.urlsafe_b64encode(url.encode('utf-8')).decode('ascii').strip("=")


class VirusTotalService:
    """Async VirusTotal v3 Client with caching and rate limit resilience."""

    def __init__(self, api_key: Optional[str] = None):
        settings = get_settings()
        self.api_key = api_key or os.getenv("VT_API_KEY") or os.getenv("VIRUSTOTAL_API_KEY") or ""
        self.is_configured = bool(self.api_key and len(self.api_key) > 10)
        self.cache_expiry_seconds = CACHE_EXPIRY_HOURS * 3600

    def get_cached(self, url: str) -> Optional[Dict[str, Any]]:
        cached = _MEM_CACHE.get(url)
        if cached:
            age = time.time() - cached.get("timestamp", 0)
            if age < self.cache_expiry_seconds:
                return cached
            else:
                _MEM_CACHE.pop(url, None)
        return None

    def store_cache(self, url: str, verdict: str, stats: Optional[Dict[str, int]] = None) -> None:
        _MEM_CACHE[url] = {
            "verdict": verdict,
            "stats": stats or {"malicious": 0, "suspicious": 0, "harmless": 0, "undetected": 0},
            "timestamp": int(time.time()),
        }

    async def scan_url(self, url: str) -> Tuple[str, Dict[str, int]]:
        """
        Scan a URL using VirusTotal API v3.
        Returns (verdict, stats_dict).
        verdict: 'malicious' | 'suspicious' | 'safe' | 'unavailable' | 'rate_limited' | 'error' | 'timeout'
        """
        norm_url = url.strip()
        if not norm_url.startswith(('http://', 'https://')):
            norm_url = 'http://' + norm_url

        # Check Cache
        cached = self.get_cached(norm_url)
        if cached:
            log.info("VirusTotal cache HIT", url=norm_url, verdict=cached["verdict"])
            return cached["verdict"], cached.get("stats", {})

        if not self.is_configured:
            log.info("VirusTotal API key not configured, returning unavailable")
            return "unavailable", {"malicious": 0, "suspicious": 0, "harmless": 0, "undetected": 0}

        try:
            url_id = _get_url_id(norm_url)
            vt_endpoint = f"https://www.virustotal.com/api/v3/urls/{url_id}"
            headers = {
                "x-apikey": self.api_key,
                "Accept": "application/json",
            }

            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(vt_endpoint, headers=headers)

                if response.status_code == 200:
                    data = response.json()
                    stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
                    malicious = stats.get("malicious", 0)
                    suspicious = stats.get("suspicious", 0)
                    harmless = stats.get("harmless", 0)
                    undetected = stats.get("undetected", 0)

                    if malicious > 0:
                        verdict = "malicious"
                    elif suspicious > 2:
                        verdict = "suspicious"
                    elif harmless > 0 or undetected > 0:
                        verdict = "safe"
                    else:
                        verdict = "safe"

                    stats_dict = {
                        "malicious": malicious,
                        "suspicious": suspicious,
                        "harmless": harmless,
                        "undetected": undetected,
                    }
                    self.store_cache(norm_url, verdict, stats_dict)
                    return verdict, stats_dict

                elif response.status_code == 404:
                    log.info("VirusTotal: URL not in database (404)", url=norm_url)
                    verdict = "unavailable"
                    self.store_cache(norm_url, verdict)
                    return verdict, {}

                elif response.status_code == 429:
                    log.warning("VirusTotal rate limit exceeded (429)")
                    return "rate_limited", {}

                else:
                    log.warning("VirusTotal non-200 status code", code=response.status_code)
                    return "error", {}

        except httpx.TimeoutException:
            log.warning("VirusTotal API request timeout (20s)")
            return "timeout", {}
        except Exception as e:
            log.error("VirusTotal API unexpected error", error=str(e))
            return "error", {}

    def synthesize_verdict(
        self,
        vt_result: str,
        ml_label: str,
        ml_confidence: float,
        threshold: float = 0.85,
    ) -> Tuple[str, str]:
        """
        Two-tiered hybrid verdict synthesis:
        1. VirusTotal confirmed malicious/suspicious -> Overrides ML
        2. VirusTotal safe/unavailable/error -> ML evaluated with threshold
        3. Low confidence (< 85%) -> Safe if VT safe, else suspicious
        Returns (final_verdict, reasoning).
        """
        # Rule 1: VirusTotal confirmed threat
        if vt_result == "malicious":
            return "malicious", "VirusTotal threat intelligence confirmed malicious URL (overriding ML)."
        if vt_result == "suspicious":
            return "suspicious", "VirusTotal flagged URL as suspicious (overriding ML)."

        # Rule 2: High confidence ML detection
        if ml_confidence >= threshold:
            return ml_label, f"ML classifier confirmed {ml_label} with {ml_confidence * 100:.1f}% confidence."

        # Rule 3: Low confidence handling
        if vt_result == "safe":
            return "benign", f"ML confidence is low ({ml_confidence * 100:.1f}% < {threshold * 100:.0f}%), but VirusTotal confirms URL is safe."

        if ml_label == "benign":
            return "benign", f"ML classifies URL as benign ({ml_confidence * 100:.1f}% confidence, VT status: {vt_result})."

        # VT unavailable and ML uncertain threat
        return "suspicious", f"Low ML confidence ({ml_confidence * 100:.1f}%) and VT status {vt_result}; flagged for security review."


virustotal_service = VirusTotalService()
