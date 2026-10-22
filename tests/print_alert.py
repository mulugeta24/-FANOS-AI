import json

with open(r"C:\Program Files\Suricata\log\eve.json", "r", encoding="utf-8") as f:
    for line in f:
        if '"event_type":"alert"' in line:
            print(json.dumps(json.loads(line), indent=2))
            break
