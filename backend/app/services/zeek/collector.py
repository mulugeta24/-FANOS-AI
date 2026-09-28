"""Batch collector for the supported Zeek security logs."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from app.core.logging import log
from app.services.zeek.normalizer import ZeekNormalizer
from app.services.zeek.parser import ZeekParser


class ZeekCollector:
    """Discover, parse, and normalize supported Zeek logs in one directory."""

    SUPPORTED_LOGS = ("conn.log", "dns.log", "dhcp.log", "http.log", "ssl.log", "weird.log")

    def __init__(
        self,
        zeek_log_dir: str | Path,
        parser: ZeekParser | None = None,
        normalizer: ZeekNormalizer | None = None,
    ) -> None:
        self.zeek_log_dir = Path(zeek_log_dir).expanduser().resolve()
        self.parser = parser or ZeekParser()
        self.normalizer = normalizer or ZeekNormalizer()
        self.last_stats: dict[str, Any] = {}
        log.info("Zeek collector initialized", zeek_log_dir=str(self.zeek_log_dir))

    def collect(self) -> list[dict[str, Any]]:
        """Collect all available supported logs; unavailable logs are non-fatal."""
        events: list[dict[str, Any]] = []
        stats: dict[str, Any] = {"files_discovered": 0, "records_parsed": 0, "events_normalized": 0}
        per_log: dict[str, Any] = {}

        if not self.zeek_log_dir.is_dir():
            log.warning("Zeek log directory does not exist", zeek_log_dir=str(self.zeek_log_dir))
            self.last_stats = {**stats, "per_log": per_log}
            return events

        for file_name in self.SUPPORTED_LOGS:
            path = self.zeek_log_dir / file_name
            if not path.exists():
                log.warning("Zeek log does not exist", log_file=file_name)
                per_log[file_name] = {"status": "not_found", "records": 0, "events": 0}
                continue
            stats["files_discovered"] += 1
            records = self.parser.parse_file(path)
            log_type = path.stem
            normalized = self.normalizer.normalize_records(records, log_type)
            events.extend(normalized)
            stats["records_parsed"] += len(records)
            stats["events_normalized"] += len(normalized)
            per_log[file_name] = {"status": "collected", "records": len(records), "events": len(normalized)}
            log.info("Collected Zeek log", log_file=file_name, event_count=len(normalized))

        self.last_stats = {**stats, "per_log": per_log}
        return events

    def collect_log(self, file_name: str) -> list[dict[str, Any]]:
        """Collect one supported file, returning an empty list for unavailable input."""
        if file_name not in self.SUPPORTED_LOGS:
            log.warning("Unsupported Zeek log requested", log_file=file_name)
            return []
        path = self.zeek_log_dir / file_name
        records = self.parser.parse_file(path)
        return self.normalizer.normalize_records(records, path.stem)