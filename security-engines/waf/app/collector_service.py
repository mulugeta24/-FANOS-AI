"""
FANOS WAF Log Collector Service
================================

Continuously monitors FANOS WAF container logs, parses ModSecurity
JSON audit events, and forwards them to the FANOS backend API.

Usage:
    # Run as standalone service
    python collector_service.py --backend http://localhost:8000

    # Run with custom log directory
    python collector_service.py --backend http://fanos-backend:8000 --log-dir /var/log/waf

Architecture:
    Docker Container "fanos-waf"
        ↓ (ModSecurity JSON audit logs)
    Collector Service (this file)
        ↓ (Parse JSON → FanosWafEvent)
    Event Forwarder
        ↓ (HTTP POST)
    FANOS Backend API (/api/v1/waf/events)
        ↓
    SecurityEvent Database
"""

import argparse
import json
import logging
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Set

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from log_parser import extract_events_from_audit_entry, parse_modsec_timestamp
from event_forwarder import EventForwarder

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("fanos-waf-collector")


class WAFLogCollector:
    """
    Collects and processes WAF logs from Docker container.
    
    Uses docker logs with --follow to stream new log entries in real-time.
    Maintains a set of seen event IDs to prevent duplicate processing.
    """
    
    def __init__(
        self,
        container_name: str = "fanos-waf",
        backend_url: str = None,
        log_dir: Path = None,
        dedup_window: int = 1000,
    ):
        self.container_name = container_name
        self.forwarder = EventForwarder(backend_url=backend_url, log_dir=log_dir)
        self.seen_events: Set[str] = set()
        self.dedup_window = dedup_window
        self.stats = {
            "total_lines": 0,
            "json_entries": 0,
            "events_parsed": 0,
            "events_forwarded": 0,
            "duplicates_skipped": 0,
            "errors": 0,
        }
    
    def _is_duplicate(self, event_id: str) -> bool:
        """Check if event has already been processed."""
        if event_id in self.seen_events:
            return True
        
        # Add to seen set
        self.seen_events.add(event_id)
        
        # Limit memory usage by keeping only recent event IDs
        if len(self.seen_events) > self.dedup_window:
            # Remove oldest 20% when limit is reached
            to_remove = list(self.seen_events)[:self.dedup_window // 5]
            for eid in to_remove:
                self.seen_events.discard(eid)
        
        return False
    
    def _verify_container_running(self) -> bool:
        """Check if the WAF container is running."""
        try:
            result = subprocess.run(
                ["docker", "inspect", "-f", "{{.State.Running}}", self.container_name],
                capture_output=True,
                text=True,
                timeout=5,
            )
            return result.stdout.strip().lower() == "true"
        except Exception as e:
            logger.error("Failed to check container status: %s", e)
            return False
    
    def _stream_docker_logs(self):
        """
        Stream docker logs using 'docker logs --follow'.
        
        Yields lines as they are produced by the container.
        """
        logger.info("Starting docker logs stream for container: %s", self.container_name)
        
        try:
            # Use --since to avoid re-processing old logs on restart
            # --tail 10 to get recent context, then --follow for new entries
            process = subprocess.Popen(
                [
                    "docker", "logs",
                    "--follow",
                    "--tail", "10",
                    self.container_name,
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,  # Line-buffered
            )
            
            for line in process.stdout:
                yield line
                
        except KeyboardInterrupt:
            logger.info("Received shutdown signal")
            if process:
                process.terminate()
                process.wait(timeout=5)
            raise
        except Exception as e:
            logger.error("Error streaming docker logs: %s", e)
            raise
    
    def _process_log_line(self, line: str):
        """Process a single log line."""
        self.stats["total_lines"] += 1
        
        line = line.strip()
        if not line or not line.startswith("{"):
            # Not a JSON line - skip
            return
        
        try:
            entry = json.loads(line)
            self.stats["json_entries"] += 1
        except json.JSONDecodeError:
            # Invalid JSON - skip silently (might be truncated line)
            return
        
        # Check if this is a ModSecurity audit entry
        if "transaction" not in entry and "messages" not in entry:
            # Not a ModSecurity audit entry - skip
            return
        
        try:
            events = extract_events_from_audit_entry(entry)
            
            for event in events:
                # Deduplication
                if self._is_duplicate(event.event_id):
                    self.stats["duplicates_skipped"] += 1
                    continue
                
                self.stats["events_parsed"] += 1
                
                # Forward to backend
                self.forwarder.forward(event)
                self.stats["events_forwarded"] += 1
                
                logger.info(
                    "Processed WAF event: %s | %s | %s | %s %s",
                    event.event_id[:8],
                    event.severity,
                    event.rule_source,
                    event.http_method,
                    event.request_uri,
                )
        
        except Exception as e:
            self.stats["errors"] += 1
            logger.error("Failed to process log entry: %s", e)
    
    def _log_stats(self):
        """Log current statistics."""
        logger.info(
            "Stats: lines=%d json=%d events=%d forwarded=%d dupes=%d errors=%d",
            self.stats["total_lines"],
            self.stats["json_entries"],
            self.stats["events_parsed"],
            self.stats["events_forwarded"],
            self.stats["duplicates_skipped"],
            self.stats["errors"],
        )
    
    def run(self):
        """
        Main collection loop.
        
        Continuously streams docker logs and processes ModSecurity events.
        """
        logger.info("FANOS WAF Log Collector starting...")
        logger.info("Container: %s", self.container_name)
        logger.info("Backend: %s", self.forwarder.backend_url or "None (local-only)")
        logger.info("Log directory: %s", self.forwarder.log_dir)
        
        # Verify container is running
        if not self._verify_container_running():
            logger.error("Container %s is not running - cannot collect logs", self.container_name)
            return 1
        
        last_stats_time = time.time()
        stats_interval = 60  # Log stats every 60 seconds
        
        try:
            for line in self._stream_docker_logs():
                self._process_log_line(line)
                
                # Periodic stats logging
                if time.time() - last_stats_time >= stats_interval:
                    self._log_stats()
                    last_stats_time = time.time()
        
        except KeyboardInterrupt:
            logger.info("Shutting down gracefully...")
            self._log_stats()
            return 0
        
        except Exception as e:
            logger.error("Collector failed: %s", e)
            self._log_stats()
            return 1


def main():
    parser = argparse.ArgumentParser(
        description="FANOS WAF Log Collector Service",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Collect logs and forward to local backend
  python collector_service.py --backend http://localhost:8000

  # Collect logs from specific container
  python collector_service.py --container my-waf --backend http://backend:8000

  # Local-only mode (no backend forwarding)
  python collector_service.py --log-dir /var/log/fanos-waf
        """,
    )
    
    parser.add_argument(
        "--container",
        default="fanos-waf",
        help="Docker container name (default: fanos-waf)",
    )
    
    parser.add_argument(
        "--backend",
        default=None,
        help="FANOS backend URL (e.g., http://localhost:8000)",
    )
    
    parser.add_argument(
        "--log-dir",
        default=None,
        help="Local log directory (default: security-engines/waf/logs)",
    )
    
    parser.add_argument(
        "--dedup-window",
        type=int,
        default=1000,
        help="Deduplication window size (default: 1000 events)",
    )
    
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose debug logging",
    )
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    log_dir = Path(args.log_dir) if args.log_dir else None
    
    collector = WAFLogCollector(
        container_name=args.container,
        backend_url=args.backend,
        log_dir=log_dir,
        dedup_window=args.dedup_window,
    )
    
    return collector.run()


if __name__ == "__main__":
    sys.exit(main())
