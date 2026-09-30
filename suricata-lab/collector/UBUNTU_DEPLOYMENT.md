# FANOS Suricata Collector - Ubuntu Deployment Guide

## Architecture Overview

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

## Prerequisites

### Ubuntu VM
- Ubuntu 20.04 or later
- Suricata 8.0.7 installed and running
- Python 3.9 or later
- Network interface: `enp0s8` configured with IP `192.168.56.104`
- Host-only network connectivity to Windows host

### Windows Host
- FANOS Backend running on port 8000
- IP: `192.168.56.1`
- Backend `.env` configured with `SURICATA_INGEST_TOKEN`

### Verify Prerequisites

On Ubuntu VM:
```bash
# Check Suricata version
sudo suricata --version

# Check Suricata service status
sudo systemctl status suricata --no-pager

# Verify EVE JSON is being generated
sudo ls -lh /var/log/suricata/eve.json
sudo grep '"event_type":"alert"' /var/log/suricata/eve.json | tail -n 2

# Check network connectivity to Windows backend
curl -i --connect-timeout 5 http://192.168.56.1:8000/health
```

Expected health check response:
```json
{
  "status": "healthy",
  "service": "FANOS AI Backend",
  "version": "1.0.0",
  "ai_engine": "active"
}
```

## Installation Steps

### 1. Transfer Collector Files to Ubuntu

On Windows, prepare the collector directory:
```powershell
cd "c:\Fanos Aii\suricata-lab\collector"
```

Transfer to Ubuntu (use one of these methods):

**Method A: Using SCP (if SSH is enabled)**
```bash
scp -r c:\Fanos Aii\suricata-lab\collector username@192.168.56.104:/tmp/
```

**Method B: Using shared folder or Git**
```bash
# Clone the repository on Ubuntu if it's on GitHub
git clone https://github.com/mulugeta24/-FANOS-AI.git
cd -FANOS-AI/suricata-lab/collector
```

### 2. Install Python Dependencies on Ubuntu

```bash
# Update package list
sudo apt update

# Install Python 3 and pip if not already installed
sudo apt install -y python3 python3-pip python3-venv

# Navigate to collector directory
cd /opt/fanos-collector  # or wherever you placed the collector

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment Variables

```bash
# Create configuration directory
sudo mkdir -p /etc/fanos

# Copy environment file
sudo cp .env.ubuntu /etc/fanos/collector.env

# Edit if needed (verify token matches Windows backend)
sudo nano /etc/fanos/collector.env
```

Ensure `/etc/fanos/collector.env` contains:
```bash
SURICATA_EVE_PATH=/var/log/suricata/eve.json
FANOS_SURICATA_URL=http://192.168.56.1:8000/api/v1/suricata/events
FANOS_SURICATA_TOKEN=<YOUR_SURICATA_INGEST_TOKEN>
SURICATA_SENSOR_ID=ubuntu-suricata-01
SURICATA_COLLECTOR_STATE=/var/lib/fanos/collector-state.json
SURICATA_POLL_SECONDS=1
SURICATA_RETRY_SECONDS=5
```

### 4. Create State Directory

```bash
# Create state directory with appropriate permissions
sudo mkdir -p /var/lib/fanos
sudo chown -R $USER:$USER /var/lib/fanos
```

### 5. Test Collector Manually

Before setting up as a service, test the collector:

```bash
# Ensure virtual environment is activated
source /opt/fanos-collector/venv/bin/activate

# Export environment variables
export $(cat /etc/fanos/collector.env | xargs)

# Run collector in foreground for testing
python3 -m app.main
```

You should see logs like:
```
2026-09-28 14:30:00 INFO Forwarded Suricata alert abc123...
```

Press Ctrl+C to stop.

### 6. Create Systemd Service

Create service file:
```bash
sudo nano /etc/systemd/system/fanos-suricata-collector.service
```

Add the following content:
```ini
[Unit]
Description=FANOS Suricata Collector
After=network.target suricata.service
Requires=suricata.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/fanos-collector
EnvironmentFile=/etc/fanos/collector.env
ExecStart=/opt/fanos-collector/venv/bin/python3 -m app.main
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

### 7. Enable and Start Service

```bash
# Reload systemd to recognize new service
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable fanos-suricata-collector

# Start the service
sudo systemctl start fanos-suricata-collector

# Check service status
sudo systemctl status fanos-suricata-collector --no-pager
```

### 8. Monitor Logs

```bash
# Follow collector logs in real-time
sudo journalctl -u fanos-suricata-collector -f

# View last 50 lines
sudo journalctl -u fanos-suricata-collector -n 50 --no-pager
```

## Verification

### End-to-End Test

1. **Verify Suricata is generating alerts:**
```bash
sudo tail -f /var/log/suricata/eve.json | grep '"event_type":"alert"'
```

2. **Check collector is processing events:**
```bash
sudo journalctl -u fanos-suricata-collector -f
```

You should see:
```
INFO Forwarded Suricata alert <event_id>
```

3. **On Windows, check backend logs:**
```powershell
cd "c:\Fanos Aii\backend"
python run.py
```

Backend logs should show:
```
[DEDUP] New event accepted
[PERSIST] Suricata event stored successfully - Event ID: 123
```

4. **Verify in database (Windows):**
```powershell
# Using PostgreSQL client
psql -U postgres -d fanos_db
SELECT id, severity, attack_type, source_ip, signature, sensor_id, created_at 
FROM security_events 
WHERE sensor_source = 'suricata' 
ORDER BY created_at DESC 
LIMIT 5;
```

5. **Check SOC Dashboard (Windows browser):**
- Navigate to: http://localhost:3000
- Login with admin credentials
- Go to Security Events or Suricata Events page
- Verify events from `ubuntu-suricata-01` are visible

## Troubleshooting

### Collector Won't Start

**Check permissions:**
```bash
# Collector needs read access to Suricata logs
sudo chmod +r /var/log/suricata/eve.json
sudo usermod -aG adm $USER  # Add user to adm group for log access
```

**Check EVE log exists:**
```bash
sudo ls -lh /var/log/suricata/eve.json
```

### HTTP 401 Unauthorized

**Token mismatch between Ubuntu and Windows:**

On Ubuntu:
```bash
grep FANOS_SURICATA_TOKEN /etc/fanos/collector.env
```

On Windows:
```powershell
Select-String -Path "c:\Fanos Aii\backend\.env" -Pattern "SURICATA_INGEST_TOKEN"
```

Both tokens must match exactly.

### HTTP Connection Refused

**Check Windows backend is running:**
```bash
curl -i http://192.168.56.1:8000/health
```

**Check Windows Firewall:**
```powershell
# On Windows, allow port 8000
New-NetFirewallRule -DisplayName "FANOS Backend" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
```

### No Events Being Forwarded

**Check Suricata is generating alerts:**
```bash
sudo tail -n 100 /var/log/suricata/eve.json | grep '"event_type":"alert"' | wc -l
```

If zero, Suricata isn't detecting threats. Generate test traffic or check Suricata rules.

**Check collector state:**
```bash
cat /var/lib/fanos/collector-state.json
```

**Reset collector state (if stuck):**
```bash
sudo systemctl stop fanos-suricata-collector
sudo rm /var/lib/fanos/collector-state.json
sudo systemctl start fanos-suricata-collector
```

### Events Not Appearing in Dashboard

**Check backend database connection:**
```powershell
# On Windows
cd "c:\Fanos Aii\backend"
python check_sensors.py
```

**Check organization/asset mapping:**
Events may be filtered by organization. Ensure the sensor or destination IP has an associated asset in the database.

## Maintenance

### Update Collector Code

```bash
# Stop service
sudo systemctl stop fanos-suricata-collector

# Update code (pull from Git or copy new files)
cd /opt/fanos-collector
git pull

# Restart service
sudo systemctl start fanos-suricata-collector
```

### Rotate Logs

Collector logs via journald are automatically rotated. To manually clear:
```bash
sudo journalctl --rotate
sudo journalctl --vacuum-time=7d
```

### Backup Collector State

```bash
sudo cp /var/lib/fanos/collector-state.json /var/lib/fanos/collector-state.json.backup
```

### Monitor Collector Health

```bash
# Check if collector is running
systemctl is-active fanos-suricata-collector

# Check for recent errors
sudo journalctl -u fanos-suricata-collector --since "1 hour ago" -p err
```

## Security Notes

1. **Token Security**: The `FANOS_SURICATA_TOKEN` is sensitive. Ensure:
   - File permissions: `sudo chmod 600 /etc/fanos/collector.env`
   - Never commit tokens to Git
   - Rotate tokens periodically

2. **Network Security**: The collector communicates over the Host-only network (192.168.56.0/24), which is isolated from external networks.

3. **Service User**: Consider running the collector as a dedicated non-root user:
```bash
sudo useradd -r -s /bin/false fanos-collector
sudo chown -R fanos-collector:fanos-collector /opt/fanos-collector /var/lib/fanos
# Update service file User=fanos-collector
```

## Performance Tuning

For high-volume Suricata deployments:

1. **Increase poll frequency:**
```bash
# In /etc/fanos/collector.env
SURICATA_POLL_SECONDS=0.5  # Check more frequently
```

2. **Monitor resource usage:**
```bash
sudo systemctl status fanos-suricata-collector
# Look at Memory and CPU usage
```

3. **Check state file size:**
```bash
du -h /var/lib/fanos/collector-state.json
```

The state file tracks up to 50,000 recent event IDs for deduplication. This is automatically managed.

## Architecture Decisions

**Why Ubuntu for Suricata?**
- Windows blocked Suricata executable due to Code Integrity / App Control policies
- Ubuntu provides stable, production-ready Suricata packages
- Better performance for packet capture on Linux

**Why Keep Backend on Windows?**
- Existing FANOS platform infrastructure
- PostgreSQL and Redis already configured
- Frontend and SOC Dashboard dependencies
- No need to migrate entire platform

**Communication Model:**
- Collector reads local Suricata EVE log (file-based)
- Sends HTTP POST to Windows backend
- Stateless authentication via header token
- Retry logic handles temporary backend outages

## Support

For issues or questions:
1. Check logs: `sudo journalctl -u fanos-suricata-collector -n 100`
2. Verify network connectivity: `curl http://192.168.56.1:8000/health`
3. Review this guide's troubleshooting section
4. Check FANOS AI documentation

---

**Document Version:** 1.0  
**Last Updated:** 2026-09-28  
**Target Platform:** Ubuntu 20.04+ with Suricata 8.0.7  
**Backend:** FANOS AI v1.0.0 on Windows 11
