# FANOS Suricata Collector

## Overview

This collector reads Suricata EVE JSON logs, parses real `alert` records, and forwards normalized events to the FANOS backend over HTTP.

**Key Features:**
- Incremental file reading with state persistence
- Deduplication based on event fingerprints
- Automatic retry on backend failures
- Safe handling of log rotation
- No synthetic alerts - only real Suricata detections
- Authentication via secure token headers

## Architecture

### Current Deployment (Ubuntu VM)

```
Ubuntu VM (192.168.56.104)          Windows Host (192.168.56.1)
┌─────────────────────────────┐     ┌──────────────────────────────┐
│                             │     │                              │
│  Suricata 8.0.7             │     │  FANOS Backend :8000         │
│  ↓                          │     │  ├── PostgreSQL              │
│  /var/log/suricata/eve.json │     │  ├── Redis                   │
│  ↓                          │     │  ├── AI/ML Engine            │
│  FANOS Collector            │────→│  ├── Rule Engine             │
│  (Python Service)           │ HTTP│  ├── Risk Engine             │
│                             │     │  └── SOC Dashboard           │
└─────────────────────────────┘     └──────────────────────────────┘
```

Suricata and the collector run on Ubuntu due to Windows Code Integrity policies blocking the Suricata executable. The FANOS platform remains on Windows for existing infrastructure compatibility.

## Quick Start

### Ubuntu Deployment (Recommended)

1. **Transfer files to Ubuntu VM:**
   ```bash
   scp -r collector/ username@192.168.56.104:/tmp/
   ```

2. **Run automated setup:**
   ```bash
   sudo bash /tmp/collector/setup-ubuntu.sh
   ```

3. **Configure authentication token:**
   ```bash
   sudo nano /etc/fanos/collector.env
   # Set FANOS_SURICATA_TOKEN to match Windows backend
   ```

4. **Start the service:**
   ```bash
   sudo systemctl start fanos-suricata-collector
   sudo systemctl status fanos-suricata-collector
   ```

5. **Monitor logs:**
   ```bash
   sudo journalctl -u fanos-suricata-collector -f
   ```

For detailed deployment instructions, see [UBUNTU_DEPLOYMENT.md](./UBUNTU_DEPLOYMENT.md).

## Configuration

Environment variables (set in `/etc/fanos/collector.env` on Ubuntu):

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SURICATA_EVE_PATH` | Path to Suricata EVE JSON log | - | Yes |
| `FANOS_SURICATA_URL` | FANOS backend ingestion endpoint | - | Yes |
| `FANOS_SURICATA_TOKEN` | Authentication token (must match backend) | - | Yes |
| `SURICATA_SENSOR_ID` | Sensor identifier for this collector | `ubuntu-suricata-01` | No |
| `SURICATA_COLLECTOR_STATE` | State file path (tracks position) | `collector-state.json` | No |
| `SURICATA_POLL_SECONDS` | Log polling interval | `1` | No |
| `SURICATA_RETRY_SECONDS` | Retry interval on failure | `5` | No |

### Example Configuration (Ubuntu)

```bash
SURICATA_EVE_PATH=/var/log/suricata/eve.json
FANOS_SURICATA_URL=http://192.168.56.1:8000/api/v1/suricata/events
FANOS_SURICATA_TOKEN=<YOUR_SURICATA_INGEST_TOKEN>
SURICATA_SENSOR_ID=ubuntu-suricata-01
SURICATA_COLLECTOR_STATE=/var/lib/fanos/collector-state.json
SURICATA_POLL_SECONDS=1
SURICATA_RETRY_SECONDS=5
```

## Backend Configuration

On the Windows FANOS backend, ensure `backend/.env` contains:

```bash
SURICATA_INGEST_TOKEN=<YOUR_SURICATA_INGEST_TOKEN>
```

This token must match the collector's `FANOS_SURICATA_TOKEN`.

## How It Works

1. **File Tailing:** Collector reads from the configured EVE JSON log file incrementally
2. **State Tracking:** Byte offset and inode are persisted to handle log rotation
3. **Parsing:** Only events with `"event_type": "alert"` are processed
4. **Normalization:** Suricata alerts are mapped to FANOS event schema
5. **Deduplication:** Event fingerprint is tracked in Redis (50,000 recent events)
6. **Authentication:** HTTP header `X-FANOS-Suricata-Token` validates the collector
7. **Persistence:** Backend stores events in PostgreSQL with AI/ML enrichment
8. **Retry Logic:** Failed sends are retried indefinitely until successful

## Event Schema

The collector sends normalized events to the backend:

```json
{
  "event_id": "sha256_hash_of_event",
  "timestamp": "2026-09-28T14:12:06.393667+03:00",
  "event_type": "alert",
  "src_ip": "192.168.1.100",
  "src_port": 54321,
  "dest_ip": "10.0.0.50",
  "dest_port": 80,
  "proto": "TCP",
  "signature_id": 2200121,
  "signature": "SURICATA Ethertype unknown",
  "category": "Generic Protocol Command Decode",
  "severity": 3,
  "action": "ALLOWED",
  "sensor_id": "ubuntu-suricata-01",
  "raw_event": { /* original Suricata event */ }
}
```

## Troubleshooting

### Collector Not Forwarding Events

1. Check Suricata is generating alerts:
   ```bash
   sudo tail -f /var/log/suricata/eve.json | grep alert
   ```

2. Check collector logs:
   ```bash
   sudo journalctl -u fanos-suricata-collector -n 50
   ```

3. Verify network connectivity:
   ```bash
   curl -i http://192.168.56.1:8000/health
   ```

### HTTP 401 Unauthorized

Token mismatch. Compare tokens:

**Ubuntu:**
```bash
grep FANOS_SURICATA_TOKEN /etc/fanos/collector.env
```

**Windows:**
```powershell
Select-String -Path "c:\Fanos Aii\backend\.env" -Pattern "SURICATA_INGEST_TOKEN"
```

Tokens must match exactly. Update and restart:
```bash
sudo systemctl restart fanos-suricata-collector
```

### Collector State Issues

If the collector appears stuck or skipping events:
```bash
sudo systemctl stop fanos-suricata-collector
sudo rm /var/lib/fanos/collector-state.json
sudo systemctl start fanos-suricata-collector
```

This resets the offset and reprocesses from the current position.

## Files

- `app/main.py` - Main collector loop (file tailing, state management)
- `app/parser.py` - Suricata EVE JSON parser and normalizer
- `app/sender.py` - HTTP client for backend communication
- `app/models.py` - Event data models
- `app/config.py` - Configuration management
- `.env.ubuntu` - Ubuntu environment template
- `setup-ubuntu.sh` - Automated Ubuntu installation script
- `fanos-suricata-collector.service` - Systemd service file
- `UBUNTU_DEPLOYMENT.md` - Comprehensive deployment guide

## Development

Run locally for testing:

```bash
# Activate virtual environment
source venv/bin/activate

# Export environment variables
export $(cat /etc/fanos/collector.env | xargs)

# Run collector
python3 -m app.main
```

Press Ctrl+C to stop.

## Security Notes

- The `FANOS_SURICATA_TOKEN` is sensitive and should never be committed to Git
- Configuration files should have restricted permissions (`chmod 600`)
- Communication occurs over the Host-only network (isolated from external access)
- Consider running the service as a dedicated non-root user in production

## Support

For issues or questions:
1. Review [UBUNTU_DEPLOYMENT.md](./UBUNTU_DEPLOYMENT.md)
2. Check collector logs: `sudo journalctl -u fanos-suricata-collector`
3. Verify backend logs on Windows
4. Ensure Suricata is running and generating alerts

---

**Version:** 2.0  
**Platform:** Ubuntu 20.04+ with Suricata 8.0.7  
**Backend:** FANOS AI v1.0.0 on Windows 11
