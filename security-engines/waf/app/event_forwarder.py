"""
FANOS WAF Event Forwarder
==========================

Forwards normalized FanosWafEvent objects to the FANOS backend API.
Falls back to local file storage if the backend is unreachable.

This is a stub implementation for Phase 1. In production, this module
will POST events to the FANOS backend's security event ingestion
endpoint (e.g., POST /api/v1/security-events/waf).

Usage:
    from event_forwarder import EventForwarder

    forwarder = EventForwarder(backend_url="http://fanos-backend:8000")
    forwarder.forward(event)
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

try:
    import urllib.request
    import urllib.error
    HAS_URLLIB = True
except ImportError:
    HAS_URLLIB = False

from event_model import FanosWafEvent

logger = logging.getLogger("fanos-waf-forwarder")

# Default local log directory (relative to WAF root)
DEFAULT_LOG_DIR = Path(__file__).parent.parent / "logs"


class EventForwarder:
    """
    Forward FANOS WAF events to the backend API.

    Architecture:
        FanosWafEvent
            │
            ├──▶ FANOS Backend API  (POST /api/v1/security-events/waf)
            │
            └──▶ Local JSONL file   (fallback if backend unreachable)
    """

    def __init__(
        self,
        backend_url: Optional[str] = None,
        log_dir: Optional[Path] = None,
        timeout: int = 5,
    ):
        self.backend_url = backend_url
        self.log_dir = log_dir or DEFAULT_LOG_DIR
        self.timeout = timeout
        self._ensure_log_dir()

    def _ensure_log_dir(self):
        """Create the log directory if it doesn't exist."""
        self.log_dir.mkdir(parents=True, exist_ok=True)

    def _local_log_path(self) -> Path:
        """Generate today's local log file path."""
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        return self.log_dir / f"waf-events-{today}.jsonl"

    def _write_local(self, event: FanosWafEvent):
        """Append event to local JSONL log file."""
        log_path = self._local_log_path()
        try:
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(event.to_json(indent=None) + "\n")
            logger.debug("Event %s written to %s", event.event_id, log_path)
        except OSError as e:
            logger.error("Failed to write event locally: %s", e)

    def _post_to_backend(self, event: FanosWafEvent) -> bool:
        """
        POST event to FANOS backend API.

        Returns True if successful, False otherwise.
        """
        if not self.backend_url or not HAS_URLLIB:
            return False

        url = f"{self.backend_url.rstrip('/')}/api/v1/waf/events"
        payload = event.to_json(indent=None).encode("utf-8")

        try:
            req = urllib.request.Request(
                url,
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-FANOS-Source": "waf",
                    "X-FANOS-Event-ID": event.event_id,
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                if resp.status in (200, 201, 202):
                    logger.info(
                        "Event %s forwarded to backend (HTTP %d)",
                        event.event_id, resp.status,
                    )
                    return True
                else:
                    logger.warning(
                        "Backend returned HTTP %d for event %s",
                        resp.status, event.event_id,
                    )
                    return False
        except Exception as e:
            logger.warning(
                "Backend unreachable for event %s: %s", event.event_id, e
            )
            return False

    def forward(self, event: FanosWafEvent):
        """
        Forward a single event.

        1. Try to POST to FANOS backend
        2. Always write to local log (for audit trail)
        """
        # Always persist locally for audit compliance
        self._write_local(event)

        # Attempt backend forwarding
        if self.backend_url:
            success = self._post_to_backend(event)
            if not success:
                logger.info(
                    "Event %s stored locally (backend unavailable)",
                    event.event_id,
                )

    def forward_batch(self, events: list[FanosWafEvent]):
        """Forward multiple events."""
        for event in events:
            self.forward(event)
        logger.info("Forwarded batch of %d events", len(events))
