import json
from pathlib import Path

eve_path = Path(r"C:\Program Files\Suricata\log\eve.json")
alerts = []
total_alerts = 0
total_flows = 0

with open(eve_path, "r", encoding="utf-8", errors="ignore") as f:
    for line in f:
        if '"event_type":"alert"' in line:
            total_alerts += 1
            if len(alerts) < 10:
                try:
                    alerts.append(json.loads(line))
                except Exception:
                    pass
        elif '"event_type":"flow"' in line:
            total_flows += 1

print(f"Total alerts in eve.json: {total_alerts}")
print(f"Total flows in eve.json: {total_flows}")
print("\nFirst 5 alerts found:")
for a in alerts[:5]:
    sig = a.get("alert", {})
    print(f"  TIME: {a.get('timestamp')} | SID: {sig.get('signature_id')} | SEV: {sig.get('severity')} | SIG: {sig.get('signature')} | SRC: {a.get('src_ip')}:{a.get('src_port')} -> {a.get('dest_ip')}:{a.get('dest_port')}")
