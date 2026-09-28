#!/usr/bin/env python3
"""Verify a real Suricata EVE alert for an authorized lab destination."""
import json
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 3:
        print(f"usage: {sys.argv[0]} <eve.json> <authorized-destination-ip>", file=sys.stderr)
        return 2

    eve_path = Path(sys.argv[1])
    destination_ip = sys.argv[2]
    if not eve_path.is_file():
        print(f"EVE file not found: {eve_path}", file=sys.stderr)
        return 2

    found = False
    for line_number, line in enumerate(eve_path.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        if event.get("event_type") != "alert" or event.get("dest_ip") != destination_ip:
            continue
        alert = event.get("alert") or {}
        required = {
            "timestamp": event.get("timestamp"),
            "event_type": event.get("event_type"),
            "src_ip": event.get("src_ip"),
            "dest_ip": event.get("dest_ip"),
            "proto": event.get("proto"),
            "signature": alert.get("signature"),
            "signature_id": alert.get("signature_id"),
            "category": alert.get("category"),
            "severity": alert.get("severity"),
        }
        missing = [key for key, value in required.items() if value in (None, "")]
        if missing:
            print(f"line {line_number}: alert missing fields: {', '.join(missing)}", file=sys.stderr)
            return 1
        print(json.dumps(required, indent=2))
        found = True

    if not found:
        print(f"No alert for authorized destination {destination_ip} found in {eve_path}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())