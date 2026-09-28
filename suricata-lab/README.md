# FANOS AI Suricata IDS Lab

This directory contains the native Windows Suricata integration and collector used by the FANOS authorized lab. It does not modify or recreate the existing FANOS backend, database, Redis, frontend, WAF, or WAF collector services.

The final live architecture is:

```text
Kali / protected assets
        |
        | authorized traffic visible to Windows capture
        v
Windows 11 host
        |-- native Suricata IDS
        |-- configured eve.json
        `-- FANOS Suricata collector
                    |
                    v
            FANOS backend:8000
                    |
                    v
              FANOS SOC dashboard
```

## Important status

This project currently contains the Suricata configuration, local rules, collector, and verification tools. Configuration validation has passed and three local rules load successfully.

Live detection is only considered working after all of these are observed:

1. Windows packet capture sees a packet from the authorized Kali VM to the authorized target.
2. Suricata writes the corresponding alert to `logs/eve.json`.
3. The collector logs a successful backend HTTP response.
4. FANOS `/api/v1/suricata/events` returns the stored event.
5. The SOC dashboard displays that event.

An empty EVE file, a PCAP replay, or a dashboard page loading without API errors is not proof of live detection.

## Directory layout

```text
suricata-lab/
|-- config/
|   |-- classification.config  Suricata alert classifications
|   `-- suricata.yaml          IDS, EVE, protocol, and rule configuration
|-- rules/
|   |-- local.rules            Lab-only detection rules
|   `-- README.md               Rule descriptions
|-- collector/
|   |-- Dockerfile              Collector image
|   |-- requirements.txt        Collector dependencies
|   `-- app/                    EVE parser and FANOS sender
|-- logs/                       Persistent EVE and Suricata logs
|-- pcaps/                      Optional offline replay inputs
|-- scripts/
|   |-- start-suricata-collector.ps1
|   |-- stop-suricata-collector.ps1
|   `-- validate-windows-suricata.ps1
|-- docker-compose.yml          Offline PCAP replay only
`-- .env.example                Lab environment settings
```

## Network design

Native Windows Suricata is the sensor. Registering an IP in FANOS only records ownership and monitoring authorization; it does not give Windows packet visibility. The Windows host must have a real capture path, such as a physical/Npcap interface, a bridged/host-only topology that exposes the traffic to Windows, or a supported capture mechanism for the installed Suricata build. Windows-host Suricata must not be described as seeing arbitrary VM-to-VM traffic automatically.

Use one controlled VirtualBox host-only network. The addresses below are examples only and must be replaced with the actual lab values:

```text
Subnet:          192.168.56.0/24
Windows host:    192.168.56.1
Kali VM:         192.168.56.10
Ubuntu sensor:   192.168.56.20
Windows target:  192.168.56.30
```

Attach Kali, protected assets, and the Windows host to a topology where the Windows capture interface can actually observe the authorized traffic. Do not infer visibility from IP registration or basic reachability. Verify the selected Windows Npcap interface using the installed Suricata/Npcap tooling before testing.

## Prerequisites

### Windows host

- Docker Desktop running.
- FANOS services already running.
- VirtualBox installed.
- Host-only adapter configured.
- Windows firewall allows only the required lab traffic and backend access.

### Windows 11 host

- Native Windows Suricata installation.
- Npcap or the packet capture provider required by that Suricata build.
- Python 3 for the FANOS collector.
- Access to this `suricata-lab` directory.
- A Windows capture interface with verified visibility of the authorized lab traffic.

### Kali VM

- Network adapter attached to the authorized lab segment.
- The actual Windows target IP.
- No traffic directed to public or unauthorized systems.

## Configuration

Copy the example environment file on the Windows host and set real lab values:

```bash
cp .env.example .env
```

Set at least:

```bash
SURICATA_EVE_PATH=<exact eve-log.filename from native Suricata YAML>
FANOS_SURICATA_URL=http://localhost:8000/api/v1/suricata/events
```

The Windows target IP is not stored in Suricata configuration. Pass it to verification commands as an environment variable or command argument.

## Suricata configuration

The native Windows installation's active YAML provides:

- IDS mode with no inline blocking.
- `HOME_NET` set to the lab subnet.
- `EXTERNAL_NET` set to traffic outside `HOME_NET`.
- EVE JSON output at the configured Windows `eve-log.filename`.
- `alert`, `flow`, `dns`, `http`, and `tls` event types.
- Persistent `fast.log`, `stats.log`, and `suricata.log`.
- Local rule path from the active native Windows Suricata configuration.

Do not point the collector at a guessed path. Read the active configuration's `eve-log.filename`, set `SURICATA_EVE_PATH` to that exact path, and validate the same configuration with `scripts\validate-windows-suricata.ps1`.

## Local rules

The current lab rules are in `rules/local.rules`:

```text
SID 1000001  ICMP echo request
SID 1000002  TCP SYN traffic to port 8080
SID 1000003  HTTP URI containing fanos-suricata-test
```

SID `1000003` is the controlled HTTP test rule:

```text
alert http any any -> any any (msg:"FANOS LAB HTTP TEST ALERT"; http.uri; content:"fanos-suricata-test"; sid:1000003; rev:1;)
```

These are lab rules, not a production ruleset. The lab includes an authorized Nmap SYN scan rule for the approved Windows target, but real detection still requires an actual mirrored packet capture and a real EVE alert.

## Native Windows validation

Do not use Docker Compose to start the live sensor. The live sensor is a native Windows 11 Suricata installation using Npcap or the supported Windows packet-capture provider for the installed build.

From a PowerShell session on the Windows 11 host, validate the active Suricata configuration exactly as installed:

```powershell
$cfg = "C:\Program Files\Suricata\suricata.yaml"
& "C:\Program Files\Suricata\suricata.exe" -T -c $cfg
```

The project helper script does the same check with the expected Windows path:

```powershell
.\scripts\validate-windows-suricata.ps1 -ConfigPath "C:\Program Files\Suricata\suricata.yaml"
```

Expected result:

```text
3 rules successfully loaded, 0 rules failed
Configuration provided was successfully loaded. Exiting.
```

The collector must read the exact `eve-log.filename` from the active Suricata YAML. Do not guess a path.

## Start the native Windows sensor

Use the selected Windows network adapter that has a real capture path to the lab traffic. The interface must be able to see the authorized Kali-to-target flow; asset registration alone does not create visibility.

Verify that the adapter exists and is active:

```powershell
Get-NetAdapter | Format-Table Name, InterfaceDescription, Status
```

Start Suricata with the chosen interface:

```powershell
$iface = "<windows-capture-adapter>"
$cfg = "C:\Program Files\Suricata\suricata.yaml"
& "C:\Program Files\Suricata\suricata.exe" -D -c $cfg -i $iface
```

If the Suricata service is used instead, validate the service and capture interface before continuing:

```powershell
Get-Service Suricata
Get-NetAdapter -Name $iface
```

Confirm packet visibility independently of Suricata:

```powershell
tcpdump -i $iface -c 20 "host <kali-ip> and host <windows-target-ip>"
```

No packet visibility means the Windows capture path or interface selection must be fixed before continuing.

## Start the FANOS collector

The existing FANOS Suricata collector runs on the Windows 11 host. It tails the native Windows EVE file and forwards only real `event_type: alert` records. It does not create synthetic events and does not depend on a Docker socket.

From PowerShell on the Windows host:

```powershell
$env:SURICATA_EVE_PATH = "<exact eve-log.filename from the installed Suricata YAML>"
$env:FANOS_SURICATA_URL = "http://localhost:8000/api/v1/suricata/events"
$env:FANOS_SURICATA_TOKEN = ""
.\scripts\start-suricata-collector.ps1 -EvePath $env:SURICATA_EVE_PATH -BackendUrl $env:FANOS_SURICATA_URL
```

The collector runs in the background on the Windows host, reads the native `eve.json`, and posts to the existing FANOS backend. It does not expose a new public port.

Set `FANOS_SURICATA_TOKEN` in the collector environment and `SURICATA_INGEST_TOKEN` in the backend environment when collector authentication is enabled.

The collector extracts and forwards:

```text
event_id
timestamp
event_type
src_ip / src_port
dest_ip / dest_port
proto
signature_id
signature
category
severity
action
sensor_id
raw_event
```

Malformed timestamps, ports, and severities are normalized safely. Events are retried while the backend is unavailable.

## Authorized live test

Define only your actual lab addresses on the Windows host or in the lab environment:

```powershell
$KALI_IP = "<actual-kali-ip>"
$WINDOWS_IP = "<actual-windows-target-ip>"
$iface = "<windows-capture-adapter>"
```

Start a capture on the Windows host using the same interface Suricata uses:

```powershell
tcpdump -i $iface -c 20 "host $KALI_IP and host $WINDOWS_IP"
```

From Kali, send normal authorized traffic only to the Windows lab target:

```bash
curl "http://$WINDOWS_IP:8080/fanos-suricata-test"
```

If the Windows test service is on another authorized port, use that actual port and ensure the Suricata rule matches it.

Inspect the native Windows EVE JSON once the alert is generated:

```powershell
Get-Content -Raw "<exact eve-log.filename from the native YAML>" | ConvertFrom-Json | Where-Object { $_.event_type -eq "alert" }
```

Use the repository verifier for a strict check if the file is available locally:

```powershell
python .\scripts\verify-eve-alert.py "<exact eve-log.filename>" $WINDOWS_IP
```

The verifier requires timestamp, event type, source and destination IPs, protocol, signature, signature ID, category, and severity.

## Backend verification

The collector target must expose these FANOS endpoints:

```text
POST /api/v1/suricata/events
GET  /api/v1/suricata/events
GET  /api/v1/suricata/stats
```

Check the backend from the Windows host or any authorized lab management host:

```powershell
Invoke-RestMethod "http://localhost:8000/api/v1/suricata/stats"
```

Expected empty response before a real alert:

```json
{"total_events":0,"alerts":0,"critical":0,"high":0,"medium":0,"low":0}
```

After a real alert is forwarded, `total_events` and the matching severity count should increase.

## Asset registration and mapping

Asset registration records authorization and ownership; it does not create network visibility. A new asset starts as `PENDING`. An administrator must approve it before it becomes `MONITORING` with `monitoring_enabled=true`.

The backend checks a Suricata alert's `dest_ip` first and `src_ip` second. Only monitored assets are eligible, so disabled, paused, pending, and unapproved assets are not associated. The stored `SecurityEvent` includes the asset and organization IDs, asset name/IP, signature, category, destination, protocol, sensor, severity, and risk score.

Asset APIs:

```text
POST /api/v1/organizations       administrator only
POST /api/v1/assets              authenticated customer/admin
GET  /api/v1/assets              organization scoped
POST /api/v1/assets/{id}/approve administrator only
POST /api/v1/assets/{id}/pause   administrator only
```

The additive migration `backend/alembic/versions/002_organizations_assets.py` must be applied by the normal FANOS backend deployment before asset registration or mapped event persistence can be used. This lab does not apply migrations or recreate the running FANOS containers.

If the response is `404`, the running backend image does not contain the Suricata API routes. This Suricata lab does not rebuild or replace protected FANOS services. Resolve that deployment issue through the normal FANOS deployment process before declaring collector integration complete.

## Optional PCAP replay

PCAP replay is an offline test only. It is not the final architecture and must not be reported as live monitoring.

On Windows or Ubuntu, place an authorized PCAP at `pcaps/lab.pcap`, then run:

```bash
docker compose --profile replay up --build
```

The replay service exits after processing the file. Output is written to `logs/eve.json`, `logs/fast.log`, and `logs/suricata.log`.

An empty `pcaps` directory is normal for the live architecture. Do not solve a missing `lab.pcap` error by calling replay live.

## End-to-end checklist

### 1. VirtualBox network

```powershell
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" list hostonlyifs
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" list runningvms
```

Confirm Kali and the Windows 11 host are in the same lab topology and that the Windows capture interface can see the authorized traffic.

### 2. Connectivity

From Kali:

```bash
ping -c 3 "$WINDOWS_IP"
```

From the Windows 11 host:

```powershell
ping $WINDOWS_IP
Invoke-WebRequest "http://$WINDOWS_IP:8080/"
```

### 3. Suricata

```powershell
Get-Process suricata
Test-Path "<exact eve-log.filename from the installed Suricata YAML>"
Get-Content -Tail 50 "<suricata log path>"
```

### 4. Packet detection

Prove both Windows `tcpdump` visibility and a matching EVE alert. Do not skip either proof.

### 5. Collector

```powershell
Get-Content -Tail 100 .\suricata-lab\logs\collector.log
```

Look for a successful HTTP response after the real alert is appended.

### 6. FANOS API and database

```powershell
Invoke-RestMethod "http://localhost:8000/api/v1/suricata/stats"
Invoke-RestMethod "http://localhost:8000/api/v1/suricata/events?limit=10&hours=24"
```

### 7. SOC dashboard

Refresh the Suricata page. The page should show `ONLINE`, the alert count, signature, source IP, destination IP, protocol, severity, and event time.

## Nmap test policy

Do not run Nmap until the basic HTTP alert path is proven. If an authorized scan is later tested, target only the registered Windows lab IP:

```bash
nmap -sS "$WINDOWS_IP"
```

The current local rules do not contain a dedicated Nmap detection rule. Do not claim that an Nmap alert exists unless an enabled Suricata ruleset produces a real EVE alert.

## Troubleshooting order

Troubleshoot in this order and record the evidence for each step:

1. VirtualBox host-only adapter.
2. Kali-to-Windows connectivity.
3. Windows-to-lab connectivity.
4. Windows capture interface name.
5. `tcpdump` packet visibility.
6. Suricata startup and configuration validation.
7. EVE JSON creation and alert content.
8. Collector EVE tailing.
9. Collector-to-backend URL and HTTP response.
10. FANOS database persistence.
11. SOC dashboard API response and rendering.

For each failure record:

```text
Component:
Expected behavior:
Actual behavior:
Root cause:
Fix:
Verification:
```

## Current known limitations

- Live Kali traffic has not been proven in this Windows session until the Windows host and Kali VM are running and packet evidence is captured.
- The running backend route can exist before migration `002` is applied; asset-backed event persistence requires the migration and a backend deployment containing the current models.
- Customer event queries require a valid FANOS JWT and return only events mapped to that customer organization.
- The current local rules are lab rules and are not a production ET/Suricata ruleset.

## Safety boundaries

- Use only the Kali VM, Windows lab target, Windows 11 host, and FANOS environment you control.
- Never use public IP addresses or third-party systems for these tests.
- Do not add the Suricata collector to the WAF collector service.
- Do not expose unnecessary ports.
- Do not store production traffic or sensitive captures in this directory.
- Do not claim `LIVE ALERTS WORK` until packet visibility, EVE output, collector HTTP success, backend persistence, and dashboard display are all observed.
