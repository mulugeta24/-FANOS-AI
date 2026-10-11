#!/usr/bin/env python3
"""
FANOS AI — Live Traffic Test Generator
=======================================
Simulates live Suricata EVE flow telemetry records for various network traffic profiles
(BENIGN, PortScan, DoS Hulk, DDoS, etc.) and posts them to the live FANOS backend
running at http://localhost:8000/api/v1/suricata/flows.

Run this script to observe real-time ML inference, risk calculation,
and event persistence in the FANOS database and UI.
"""
import json
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta

BACKEND_URL = "http://localhost:8000/api/v1/suricata/flows"
INGEST_TOKEN = "fanos_suricata_secret_token_2026"

now = datetime.now(timezone.utc)

TRAFFIC_SCENARIOS = [
    {
        "name": "Normal Web Browsing (BENIGN)",
        "expected": "BENIGN",
        "flow": {
            "timestamp": now.isoformat(),
            "event_type": "flow",
            "flow_id": int(time.time() * 1000) % 10000000 + 1,
            "src_ip": "192.168.1.105",
            "src_port": 54120,
            "dest_ip": "142.250.190.46",
            "dest_port": 443,
            "proto": "TCP",
            "app_proto": "tls",
            "flow": {
                "pkts_toserver": 18,
                "pkts_toclient": 24,
                "bytes_toserver": 2340,
                "bytes_toclient": 28450,
                "start": (now - timedelta(seconds=4)).isoformat(),
                "end": now.isoformat(),
                "age": 4,
                "state": "closed",
            },
            "tcp": {
                "syn": True,
                "ack": True,
                "fin": True,
                "rst": False,
                "psh": True,
            }
        }
    },
    {
        "name": "High-Rate HTTP Flooding (DoS Hulk Attack)",
        "expected": "DoS Hulk",
        "flow": {
            "timestamp": now.isoformat(),
            "event_type": "flow",
            "flow_id": int(time.time() * 1000) % 10000000 + 2,
            "src_ip": "172.16.0.100",
            "src_port": 49152,
            "dest_ip": "192.168.1.50",
            "dest_port": 80,
            "proto": "TCP",
            "app_proto": "http",
            "flow": {
                "pkts_toserver": 3,
                "pkts_toclient": 6,
                "bytes_toserver": 382,
                "bytes_toclient": 11595,
                "start": (now - timedelta(milliseconds=2)).isoformat(),
                "end": now.isoformat(),
                "age": 0,
                "state": "established",
            },
            "tcp": {
                "syn": False,
                "ack": False,
                "rst": False,
                "fin": False,
                "psh": True,
            }
        }
    },
    {
        "name": "Volumetric Flow Flooding (DDoS Attack)",
        "expected": "DDoS",
        "flow": {
            "timestamp": now.isoformat(),
            "event_type": "flow",
            "flow_id": int(time.time() * 1000) % 10000000 + 3,
            "src_ip": "172.16.0.45",
            "src_port": 38102,
            "dest_ip": "192.168.1.50",
            "dest_port": 80,
            "proto": "TCP",
            "app_proto": "http",
            "flow": {
                "pkts_toserver": 3,
                "pkts_toclient": 7,
                "bytes_toserver": 26,
                "bytes_toclient": 11607,
                "start": (now - timedelta(milliseconds=1293)).isoformat(),
                "end": now.isoformat(),
                "age": 1,
                "state": "established",
            },
            "tcp": {
                "syn": False,
                "ack": False,
                "rst": False,
                "fin": False,
                "psh": True,
            }
        }
    },
    {
        "name": "Stealthy Service Reconnaissance (PortScan)",
        "expected": "PortScan",
        "flow": {
            "timestamp": now.isoformat(),
            "event_type": "flow",
            "flow_id": int(time.time() * 1000) % 10000000 + 4,
            "src_ip": "192.168.1.200",
            "src_port": 49812,
            "dest_ip": "192.168.1.50",
            "dest_port": 80,
            "proto": "TCP",
            "app_proto": "http",
            "flow": {
                "pkts_toserver": 6,
                "pkts_toclient": 5,
                "bytes_toserver": 703,
                "bytes_toclient": 1414,
                "start": (now - timedelta(seconds=5)).isoformat(),
                "end": now.isoformat(),
                "age": 5,
                "state": "closed",
            },
            "tcp": {
                "syn": False,
                "ack": False,
                "rst": False,
                "fin": False,
                "psh": True,
            }
        }
    }
]


def send_flow(scenario):
    name = scenario["name"]
    expected = scenario.get("expected", "UNKNOWN")
    payload = scenario["flow"]
    body = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "X-Fanos-Suricata-Token": INGEST_TOKEN
    }

    req = urllib.request.Request(BACKEND_URL, data=body, headers=headers)
    print(f"\n[-] Testing: {name}")
    print(f"    Expected Class : {expected}")
    print(f"    Flow Target    : {payload['src_ip']}:{payload['src_port']} -> {payload['dest_ip']}:{payload['dest_port']} ({payload['proto']})")

    try:
        t0 = time.perf_counter()
        with urllib.request.urlopen(req) as resp:
            elapsed_ms = (time.perf_counter() - t0) * 1000
            data = json.loads(resp.read().decode("utf-8"))
            pred = data.get("ml_prediction", {})
            pred_class = pred.get("class")
            conf = pred.get("confidence") * 100.0 if pred.get("confidence") <= 1.0 else pred.get("confidence")
            match_str = "[MATCH]" if pred_class == expected else "[DIFFERENT]"
            print(f"    [+] Status         : HTTP {resp.status} ({elapsed_ms:.1f}ms)")
            print(f"    [+] ML Output      : {pred_class} (Display: {pred.get('display')}) {match_str}")
            print(f"    [+] Confidence     : {conf:.2f}%")
            print(f"    [+] Risk Score     : {pred.get('risk_score')} (Level: {pred.get('risk_level')})")
            print(f"    [+] Schema Applied : {pred.get('feature_schema')}")
            print(f"    [+] Sensor Source  : {pred.get('sensor_source')}")
            print(f"    [+] DB Event ID    : {data.get('event_id')}")
            return True
    except urllib.error.HTTPError as e:
        print(f"    [!] HTTP Error {e.code}: {e.read().decode('utf-8')}")
        return False
    except Exception as exc:
        print(f"    [!] Error sending flow: {exc}")
        return False


def main():
    print("=" * 75)
    print("  FANOS AI — LIVE SURICATA FLOW ML DETECTION TEST RUNNER")
    print("=" * 75)
    print(f"Target Ingestion URL : {BACKEND_URL}")
    print(f"Execution Timestamp  : {datetime.now(timezone.utc).isoformat()}")

    success_count = 0
    for scenario in TRAFFIC_SCENARIOS:
        if send_flow(scenario):
            success_count += 1
        time.sleep(0.3)

    print("\n" + "=" * 75)
    print(f"  TEST COMPLETE: {success_count}/{len(TRAFFIC_SCENARIOS)} scenarios processed.")
    print("  You can now open the FANOS Dashboard in your browser at:")
    print("  --> http://localhost:3000")
    print("  to view these security events on the interactive map & event timeline.")
    print("=" * 75)


if __name__ == "__main__":
    main()
