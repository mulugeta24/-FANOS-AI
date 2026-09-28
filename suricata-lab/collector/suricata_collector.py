import json
import time
import os
import uuid
import urllib.request
import urllib.error
from pathlib import Path

EVE_FILE = Path(os.environ.get("SURICATA_EVE_LOG", "/var/log/suricata/eve.json"))
BACKEND_URL = os.environ.get("BACKEND_URL", "http://backend:8000")
API_ENDPOINT = f"{BACKEND_URL.rstrip('/')}/api/v1/suricata/events"
SURICATA_TOKEN = os.environ.get("FANOS_SURICATA_TOKEN", "")

def normalize_suricata_event(raw_event, event_id):
    alert = raw_event.get("alert", {})
    
    canonical = {
        "event_id": event_id,
        "event_time": raw_event.get("timestamp"),
        "sensor": {
            "type": "suricata",
            "name": "suricata",
            "version": raw_event.get("suricata_version", "unknown")
        },
        "event": {
            "type": "network_detection",
            "category": "intrusion_detection",
            "action": alert.get("action", "alert").lower()
        },
        "source": {
            "ip": raw_event.get("src_ip", "unknown"),
            "port": raw_event.get("src_port")
        },
        "destination": {
            "ip": raw_event.get("dest_ip", "unknown"),
            "port": raw_event.get("dest_port")
        },
        "network": {
            "protocol": raw_event.get("proto", "unknown").upper() if raw_event.get("proto") else "unknown",
            "application_protocol": raw_event.get("app_proto", "unknown")
        },
        "detection": {
            "signature_id": alert.get("signature_id"),
            "signature": alert.get("signature", "Suricata event"),
            "severity": alert.get("severity", 3),
            "category": alert.get("category", "Network Detection")
        },
        "asset": {
            "ip": raw_event.get("dest_ip", "unknown"),
            "port": raw_event.get("dest_port"),
            "criticality": None
        },
        "raw": {
            "original_event": raw_event
        }
    }
    return canonical

def send_to_backend(event):
    print("[SURICATA]")
    print("Raw alert received\n")
    
    event_id = str(uuid.uuid4())
    
    canonical_event = normalize_suricata_event(event, event_id)
    
    print("[NORMALIZER]")
    print("Canonical FANOS event created\n")
    
    payload = {
        "event_id": canonical_event["event_id"],
        "timestamp": canonical_event["event_time"],
        "event_type": "alert",
        "source_ip": canonical_event["source"]["ip"],
        "source_port": canonical_event["source"]["port"],
        "destination_ip": canonical_event["destination"]["ip"],
        "destination_port": canonical_event["destination"]["port"],
        "protocol": canonical_event["network"]["protocol"],
        "signature_id": canonical_event["detection"]["signature_id"],
        "signature": canonical_event["detection"]["signature"],
        "category": canonical_event["detection"]["category"],
        "severity": canonical_event["detection"]["severity"],
        "action": canonical_event["event"]["action"].upper(),
        "raw_event": canonical_event
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    if SURICATA_TOKEN:
        headers["x-fanos-suricata-token"] = SURICATA_TOKEN
        
    req = urllib.request.Request(
        API_ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    
    max_retries = 5
    retry_delay = 5
    for attempt in range(max_retries):
        try:
            response = urllib.request.urlopen(req, timeout=10)
            status_code = response.getcode()
            print("[BACKEND]")
            print(f"FANOS backend response: {status_code}")
            print("Backend accepted event")
            print(f"Signature: {payload['signature']}\n")
            break
        except urllib.error.HTTPError as e:
            if e.code in [401, 403]:
                print(f"[BACKEND] Authentication/authorization failed: {e.code}")
                break
            elif e.code == 400:
                print(f"[WARNING] Invalid Suricata event (HTTP 400)")
                break
            else:
                print(f"[BACKEND] Delivery failed (HTTP {e.code}). Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
        except urllib.error.URLError as e:
            print(f"[BACKEND] Backend unavailable: {e.reason}. Retrying in {retry_delay}s...")
            time.sleep(retry_delay)
        except Exception as e:
            print(f"[BACKEND] Unexpected error: {str(e)}. Retrying in {retry_delay}s...")
            time.sleep(retry_delay)

def print_alert(event):
    alert = event.get("alert", {})
    flow_id = event.get("flow_id", "N/A")

    print()
    print("=" * 70)
    print("🚨 SURICATA ALERT RECEIVED")
    print("=" * 70)
    print(f"Timestamp   : {event.get('timestamp', 'N/A')}")
    print(f"Source      : {event.get('src_ip', 'N/A')}:{event.get('src_port', 'N/A')}")
    print(f"Destination : {event.get('dest_ip', 'N/A')}:{event.get('dest_port', 'N/A')}")
    print(f"Protocol    : {event.get('proto', 'N/A')}")
    print(f"App Protocol: {event.get('app_proto', 'N/A')}")
    print(f"Signature   : {alert.get('signature', 'N/A')}")
    print(f"SID         : {alert.get('signature_id', 'N/A')}")
    print(f"Severity    : {alert.get('severity', 'N/A')}")
    print(f"Flow ID     : {flow_id}")
    print("=" * 70)
    print()


def main():
    print("[INFO] Suricata Collector started")
    print(f"[INFO] Watching {EVE_FILE}")
    print(f"Backend URL: {BACKEND_URL}")
    print()

    if not EVE_FILE.exists():
        print("ERROR: eve.json was not found.")
        print(f"Expected: {EVE_FILE}")
        return

    print("SUCCESS: eve.json found.")
    print("Collector is waiting for NEW Suricata events...")
    print("Press Ctrl+C to stop.")
    print()

    with EVE_FILE.open("r", encoding="utf-8") as file:
        # Start at the end so old events are not replayed.
        file.seek(0, 2)

        while True:
            line = file.readline()

            if not line:
                time.sleep(0.5)
                continue

            line = line.strip()

            if not line:
                continue

            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                print("WARNING: Invalid JSON line received.")
                continue

            if event.get("event_type") == "alert":
                print_alert(event)
                send_to_backend(event)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print()
        print("Collector stopped.")
