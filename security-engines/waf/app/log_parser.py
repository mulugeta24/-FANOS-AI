"""
FANOS WAF Audit Log Parser
============================

Parses ModSecurity JSON audit log entries into normalized FanosWafEvent
objects that can be consumed by the FANOS backend, SOC dashboard, and
AI/ML pipeline.

Usage:
    # Parse from file
    python -m security-engines.waf.app.log_parser --input audit.log

    # Parse from stdin (pipe docker logs)
    docker logs fanos-waf 2>&1 | python log_parser.py

    # Parse and forward to FANOS backend
    python log_parser.py --input audit.log --output events.jsonl
"""

import json
import sys
import argparse
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Generator, Optional

from event_model import (
    FanosWafEvent,
    classify_rule_source,
    map_severity,
    map_action,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger("fanos-waf-parser")


def parse_modsec_timestamp(ts_str: str) -> str:
    """
    Parse ModSecurity timestamp formats into ISO 8601.

    ModSecurity uses formats like:
        "09/Oct/2024:14:30:00 +0000"
        "2024-10-09T14:30:00Z"
    """
    if not ts_str:
        return datetime.now(timezone.utc).isoformat()

    # Try ISO 8601 first
    try:
        return datetime.fromisoformat(ts_str.replace("Z", "+00:00")).isoformat()
    except (ValueError, AttributeError):
        pass

    # Try Apache/ModSecurity common format
    try:
        dt = datetime.strptime(ts_str, "%d/%b/%Y:%H:%M:%S %z")
        return dt.isoformat()
    except (ValueError, AttributeError):
        pass

    return datetime.now(timezone.utc).isoformat()


def extract_events_from_audit_entry(entry: dict) -> list[FanosWafEvent]:
    """
    Extract one or more FanosWafEvent objects from a single
    ModSecurity JSON audit log entry.

    The JSON audit log format (when MODSEC_AUDIT_LOG_FORMAT=JSON)
    produces entries with sections like:
        transaction: { time_stamp, client_ip, request, response, ... }
        messages: [ { id, msg, severity, ... }, ... ]
    """
    events = []

    transaction = entry.get("transaction", {})
    if not transaction and "request" in entry:
        # Flat format fallback
        transaction = entry

    # ── Extract request context ──────────────────────────────
    timestamp = parse_modsec_timestamp(
        transaction.get("time_stamp", "")
        or transaction.get("timestamp", "")
        or entry.get("time_stamp", "")
    )
    client_ip = (
        transaction.get("client_ip", "")
        or transaction.get("remote_address", "")
        or entry.get("client_ip", "")
    )
    request_id = (
        transaction.get("transaction_id", "")
        or transaction.get("unique_id", "")
        or entry.get("unique_id", "")
    )

    # Parse request line
    request = transaction.get("request", {})
    if isinstance(request, dict):
        method = request.get("method", "")
        uri = request.get("uri", "")
        headers = request.get("headers", {})
    elif isinstance(request, str):
        # "GET /path HTTP/1.1"
        parts = request.split(" ", 2)
        method = parts[0] if len(parts) > 0 else ""
        uri = parts[1] if len(parts) > 1 else ""
        headers = {}
    else:
        method = transaction.get("request_method", "")
        uri = transaction.get("request_uri", "")
        headers = transaction.get("request_headers", {})

    if isinstance(headers, dict):
        host = headers.get("Host", headers.get("host", ""))
        user_agent = headers.get(
            "User-Agent", headers.get("user-agent", "")
        )
    else:
        host = ""
        user_agent = ""

    # Parse response
    response = transaction.get("response", {})
    if isinstance(response, dict):
        status_code = int(response.get("http_code", 0) or response.get("status", 0) or 0)
    else:
        status_code = int(transaction.get("response_code", 0) or 0)

    # ── Extract rule matches ─────────────────────────────────
    messages = entry.get("messages", [])
    if not messages:
        messages = transaction.get("messages", [])
    if not messages:
        # Some formats use "matched_rules" or "audit_data"
        messages = entry.get("matched_rules", [])
    if not messages:
        messages = entry.get("audit_data", {}).get("messages", [])

    # If there are no individual messages, create a single event
    # from the top-level entry
    if not messages:
        rule_id = str(entry.get("rule_id", "") or transaction.get("rule_id", "") or "")
        rule_msg = str(entry.get("msg", "") or entry.get("message", "") or transaction.get("msg", "") or "")
        severity_raw = str(entry.get("severity", "") or transaction.get("severity", "") or "INFO")
        action_raw = str(entry.get("action", "") or transaction.get("action", "") or "log")

        if rule_id or rule_msg:
            event = FanosWafEvent(
                timestamp=timestamp,
                request_id=request_id,
                source_ip=client_ip,
                http_method=method,
                request_uri=uri,
                host=host,
                user_agent=user_agent,
                rule_id=rule_id,
                rule_message=rule_msg,
                rule_source=classify_rule_source(rule_id).value,
                severity=map_severity(severity_raw).value,
                anomaly_score=int(entry.get("anomaly_score", 0) or 0),
                action=map_action(action_raw).value,
                status_code=status_code,
            )
            events.append(event)
        return events

    # Process each matched rule as a separate event
    for msg_entry in messages:
        if isinstance(msg_entry, str):
            # Plain string message — try to extract rule ID
            event = FanosWafEvent(
                timestamp=timestamp,
                request_id=request_id,
                source_ip=client_ip,
                http_method=method,
                request_uri=uri,
                host=host,
                user_agent=user_agent,
                rule_message=msg_entry,
                action=map_action("log").value,
                status_code=status_code,
            )
            events.append(event)
            continue

        if not isinstance(msg_entry, dict):
            continue

        # Extract from top-level or nested "details" field
        details = msg_entry.get("details", {})
        if details and isinstance(details, dict):
            # Rule data is in nested "details" object
            rule_id = str(details.get("ruleId", "") or msg_entry.get("id", "") or "")
            severity_raw = str(details.get("severity", "") or msg_entry.get("severity", "") or "INFO")
            tags = details.get("tags", []) or msg_entry.get("tags", []) or []
        else:
            # Rule data is at top level
            rule_id = str(msg_entry.get("id", "") or msg_entry.get("ruleId", "") or "")
            severity_raw = str(msg_entry.get("severity", "") or "INFO")
            tags = msg_entry.get("tags", []) or []
        
        rule_msg = str(msg_entry.get("message", "") or msg_entry.get("msg", "") or "")
        action_raw = str(msg_entry.get("action", "") or "log")

        event = FanosWafEvent(
            timestamp=timestamp,
            request_id=request_id,
            source_ip=client_ip,
            http_method=method,
            request_uri=uri,
            host=host,
            user_agent=user_agent,
            rule_id=rule_id,
            rule_message=rule_msg,
            rule_source=classify_rule_source(rule_id).value,
            severity=map_severity(severity_raw).value,
            anomaly_score=int(msg_entry.get("anomaly_score", 0) or details.get("anomaly_score", 0) or 0),
            action=map_action(action_raw).value,
            status_code=status_code,
            tags=tags if tags else [],
        )
        events.append(event)

    return events


def parse_log_lines(lines) -> Generator[FanosWafEvent, None, None]:
    """
    Parse lines from a ModSecurity JSON audit log.
    Each line should be a complete JSON object.
    """
    for line_num, line in enumerate(lines, 1):
        line = line.strip()
        if not line:
            continue

        # Skip non-JSON lines (nginx access logs, etc.)
        if not line.startswith("{"):
            continue

        try:
            entry = json.loads(line)
        except json.JSONDecodeError as e:
            logger.warning("Line %d: Invalid JSON — %s", line_num, e)
            continue

        try:
            events = extract_events_from_audit_entry(entry)
            for event in events:
                yield event
        except Exception as e:
            logger.error("Line %d: Failed to parse entry — %s", line_num, e)
            continue


def parse_log_file(path: Path) -> list[FanosWafEvent]:
    """Parse a ModSecurity JSON audit log file."""
    logger.info("Parsing audit log: %s", path)
    with open(path, "r", encoding="utf-8") as f:
        events = list(parse_log_lines(f))
    logger.info("Parsed %d events from %s", len(events), path)
    return events


def write_events(events: list[FanosWafEvent], output_path: Optional[Path] = None):
    """Write normalized events as JSONL (one JSON object per line)."""
    if output_path:
        logger.info("Writing %d events to %s", len(events), output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "a", encoding="utf-8") as f:
            for event in events:
                f.write(event.to_json(indent=None) + "\n")
    else:
        for event in events:
            print(event.to_json(indent=None))


def main():
    parser = argparse.ArgumentParser(
        description="FANOS WAF Audit Log Parser — "
                    "transforms ModSecurity JSON logs into normalized events"
    )
    parser.add_argument(
        "--input", "-i",
        type=str,
        default=None,
        help="Path to ModSecurity JSON audit log file (default: stdin)",
    )
    parser.add_argument(
        "--output", "-o",
        type=str,
        default=None,
        help="Path to output JSONL file (default: stdout)",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose/debug logging",
    )
    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    output_path = Path(args.output) if args.output else None

    if args.input:
        events = parse_log_file(Path(args.input))
    else:
        logger.info("Reading from stdin (pipe docker logs or paste JSON)...")
        events = list(parse_log_lines(sys.stdin))
        logger.info("Parsed %d events from stdin", len(events))

    write_events(events, output_path)

    # Summary
    if events:
        sources = {}
        for e in events:
            sources[e.rule_source] = sources.get(e.rule_source, 0) + 1
        logger.info(
            "Summary: %d events — %s",
            len(events),
            ", ".join(f"{k}: {v}" for k, v in sorted(sources.items())),
        )


if __name__ == "__main__":
    main()
