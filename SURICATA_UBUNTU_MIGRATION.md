# FANOS Suricata Ubuntu Migration Summary

## Executive Summary

The FANOS Suricata IDS sensor has been migrated from Windows to Ubuntu while keeping the core FANOS platform on Windows. This architecture change addresses Windows Code Integrity policies that blocked the Suricata executable while maintaining the existing FANOS infrastructure.

## Architecture Change

### Before (All Windows)
```
Windows 11
├── FANOS Backend
├── PostgreSQL
├── Redis
├── Frontend
├── SOC Dashboard
└── Suricata IDS ❌ (blocked by Code Integrity)
```

### After (Hybrid)
```
Ubuntu VM (192.168.56.104)          Windows Host (192.168.56.1)
┌─────────────────────────────┐     ┌──────────────────────────────┐
│  Suricata 8.0.7 ✓           │     │  FANOS Backend :8000         │
│  FANOS Collector ✓          │────→│  PostgreSQL                  │
└─────────────────────────────┘HTTP │  Redis                       │
                                    │  Frontend                     │
                                    │  SOC Dashboard               │
                                    │  AI/ML Engine                │
                                    │  Rule Engine                 │
                                    └──────────────────────────────┘
```

## What Was Changed

### Backend Configuration

**File: `backend/app/core/config.py`**
- Added `SURICATA_INGEST_TOKEN` configuration field
- Added `FANOS_SURICATA_CORRELATION_WINDOW_SECONDS` (default: 300)
- Added `FANOS_SURICATA_CORRELATION_MAX_EVENTS` (default: 100)
- Added `FANOS_DEDUP_WINDOW_SECONDS` (default: 60)

**File: `backend/.env`**
- Added `SURICATA_INGEST_TOKEN=<REDACTED_TOKEN>`
- Added correlation and deduplication settings

### Collector Updates

**File: `suricata-lab/collector/app/config.py`**
- Changed default sensor ID from `windows-suricata-01` to `ubuntu-suricata-01`

### New Files Created

1. **`suricata-lab/collector/.env.ubuntu`**
   - Ubuntu-specific environment configuration template
   - Configures EVE path, backend URL, authentication token

2. **`suricata-lab/collector/UBUNTU_DEPLOYMENT.md`**
   - Comprehensive 500+ line deployment guide
   - Step-by-step installation instructions
   - Troubleshooting procedures
   - End-to-end testing procedures

3. **`suricata-lab/collector/fanos-suricata-collector.service`**
   - Systemd service file for Ubuntu
   - Automatic startup and restart configuration
   - Integration with Suricata service

4. **`suricata-lab/collector/setup-ubuntu.sh`**
   - Automated installation script
   - Handles dependencies, configuration, service setup
   - Pre-flight checks and validation

5. **`suricata-lab/collector/README.md`**
   - Updated with Ubuntu architecture
   - Quick start guide
   - Configuration reference
   - Troubleshooting section

6. **`verify-suricata-backend.ps1`**
   - Windows backend verification script
   - Checks configuration, connectivity, firewall
   - Provides deployment checklist

7. **`SURICATA_UBUNTU_MIGRATION.md`** (this file)
   - Migration summary and documentation

## What Was NOT Changed

✅ **FANOS Backend** - Remains on Windows  
✅ **PostgreSQL** - Remains on Windows  
✅ **Redis** - Remains on Windows  
✅ **Frontend** - Remains on Windows  
✅ **SOC Dashboard** - Remains on Windows  
✅ **AI/ML Engine** - Remains on Windows  
✅ **Rule Engine** - Remains on Windows  
✅ **Risk Engine** - Remains on Windows  
✅ **Docker Compose** - Remains on Windows  
✅ **WAF** - Remains on Windows  

## Network Configuration

| Component | Location | IP Address | Port |
|-----------|----------|------------|------|
| FANOS Backend | Windows | 192.168.56.1 | 8000 |
| PostgreSQL | Windows | 192.168.56.1 | 5432 |
| Redis | Windows | 192.168.56.1 | 6379 |
| Frontend | Windows | 192.168.56.1 | 3000 |
| Suricata IDS | Ubuntu VM | 192.168.56.104 | - |
| Collector | Ubuntu VM | 192.168.56.104 | - |

**Network Type:** VirtualBox Host-Only Network (192.168.56.0/24)

## Authentication Flow

```
Ubuntu Collector
│
├── Reads: /var/log/suricata/eve.json
├── Parses: alert events only
├── Normalizes: to FANOS schema
│
└── HTTP POST http://192.168.56.1:8000/api/v1/suricata/events
    Headers:
      X-FANOS-Suricata-Token: <SURICATA_INGEST_TOKEN>
    Body: JSON event
    
    ↓
    
Windows Backend
│
├── Validates: token match
├── Deduplicates: via Redis (60s window)
├── Correlates: similar events (300s window)
├── Enriches: AI/ML risk scoring
├── Persists: PostgreSQL
│
└── Displays: SOC Dashboard
```

## Deployment Checklist

### Windows Backend (Completed ✓)

- [x] Updated `backend/app/core/config.py` with Suricata token settings
- [x] Updated `backend/.env` with `SURICATA_INGEST_TOKEN`
- [x] Existing API endpoint `/api/v1/suricata/events` ready
- [x] Created verification script `verify-suricata-backend.ps1`

### Ubuntu VM (To Be Done)

- [ ] Transfer collector files to Ubuntu VM
- [ ] Run `setup-ubuntu.sh` script
- [ ] Configure `/etc/fanos/collector.env` with matching token
- [ ] Start `fanos-suricata-collector` service
- [ ] Verify logs show successful event forwarding
- [ ] Verify events appear in SOC Dashboard

## Step-by-Step Deployment

### On Windows

1. **Verify backend configuration:**
   ```powershell
   cd "c:\Fanos Aii"
   .\verify-suricata-backend.ps1
   ```

2. **Start FANOS backend (if not running):**
   ```powershell
   cd "c:\Fanos Aii\backend"
   python run.py
   ```

3. **Configure Windows Firewall:**
   ```powershell
   # Run as Administrator
   New-NetFirewallRule -DisplayName "FANOS Backend" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
   ```

4. **Verify backend is accessible:**
   ```powershell
   Invoke-RestMethod -Uri "http://192.168.56.1:8000/health"
   ```

### On Ubuntu VM

1. **Transfer collector files:**
   ```bash
   # Option A: SCP (if SSH enabled)
   scp -r /path/to/collector username@192.168.56.104:/tmp/

   # Option B: Git clone
   git clone https://github.com/mulugeta24/-FANOS-AI.git
   cd -FANOS-AI/suricata-lab/collector
   ```

2. **Run automated setup:**
   ```bash
   sudo bash setup-ubuntu.sh
   ```

3. **Configure authentication token:**
   ```bash
   sudo nano /etc/fanos/collector.env
   ```
   
   Ensure `FANOS_SURICATA_TOKEN` matches Windows backend's `SURICATA_INGEST_TOKEN`:
   ```
   FANOS_SURICATA_TOKEN=<YOUR_SURICATA_INGEST_TOKEN>
   ```

4. **Start collector service:**
   ```bash
   sudo systemctl start fanos-suricata-collector
   sudo systemctl enable fanos-suricata-collector
   ```

5. **Verify service is running:**
   ```bash
   sudo systemctl status fanos-suricata-collector --no-pager
   ```

6. **Monitor logs:**
   ```bash
   sudo journalctl -u fanos-suricata-collector -f
   ```

Expected output:
```
INFO Forwarded Suricata alert abc123def456...
```

## Verification Procedures

### 1. Verify Suricata Is Running (Ubuntu)

```bash
sudo systemctl status suricata --no-pager
sudo grep '"event_type":"alert"' /var/log/suricata/eve.json | tail -n 2
```

### 2. Verify Collector Is Running (Ubuntu)

```bash
sudo systemctl status fanos-suricata-collector --no-pager
sudo journalctl -u fanos-suricata-collector -n 20 --no-pager
```

### 3. Verify Backend Connectivity (Ubuntu)

```bash
curl -i http://192.168.56.1:8000/health
```

Expected response:
```
HTTP/1.1 200 OK
{"status":"healthy","service":"FANOS AI Backend","version":"1.0.0","ai_engine":"active"}
```

### 4. Verify Events Are Being Received (Windows)

Backend logs should show:
```
[DEDUP] New event accepted
[PERSIST] Suricata event stored successfully - Event ID: 123
```

### 5. Verify Database Persistence (Windows)

```powershell
# Using PostgreSQL client
psql -U postgres -d fanos_db
```

Query:
```sql
SELECT id, severity, attack_type, source_ip, signature, sensor_id, created_at 
FROM security_events 
WHERE sensor_source = 'suricata' 
  AND sensor_id = 'ubuntu-suricata-01'
ORDER BY created_at DESC 
LIMIT 10;
```

### 6. Verify SOC Dashboard (Windows Browser)

1. Navigate to: http://localhost:3000
2. Login with admin credentials
3. Go to Security Events or Suricata Events page
4. Filter by sensor ID: `ubuntu-suricata-01`
5. Verify recent events are visible

## Troubleshooting

### Issue: HTTP 401 Unauthorized

**Symptom:** Collector logs show `Backend returned HTTP 401`

**Cause:** Token mismatch

**Solution:**
```bash
# On Ubuntu - check collector token
grep FANOS_SURICATA_TOKEN /etc/fanos/collector.env

# On Windows - check backend token
Select-String -Path "c:\Fanos Aii\backend\.env" -Pattern "SURICATA_INGEST_TOKEN"

# Tokens must match exactly
# Update Ubuntu config and restart:
sudo systemctl restart fanos-suricata-collector
```

### Issue: Connection Refused

**Symptom:** `Could not connect to http://192.168.56.1:8000`

**Cause:** Backend not running or firewall blocking

**Solution:**
```powershell
# On Windows - verify backend is running
Invoke-RestMethod -Uri "http://localhost:8000/health"

# Check firewall rule
Get-NetFirewallRule -DisplayName "FANOS Backend"

# If missing, create rule:
New-NetFirewallRule -DisplayName "FANOS Backend" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
```

### Issue: No Events Being Forwarded

**Symptom:** Collector is running but no "Forwarded Suricata alert" logs

**Cause:** Suricata not generating alerts

**Solution:**
```bash
# Check Suricata is generating alerts
sudo tail -n 100 /var/log/suricata/eve.json | grep '"event_type":"alert"' | wc -l

# If zero, generate test traffic or check Suricata rules
sudo suricata-update
sudo systemctl restart suricata
```

### Issue: Collector Service Won't Start

**Symptom:** `systemctl start` fails

**Solution:**
```bash
# Check service logs
sudo journalctl -u fanos-suricata-collector -n 50 --no-pager

# Check configuration
sudo cat /etc/fanos/collector.env

# Verify EVE log exists and is readable
sudo ls -lh /var/log/suricata/eve.json
sudo chmod +r /var/log/suricata/eve.json

# Test manually
cd /opt/fanos-collector
source venv/bin/activate
export $(cat /etc/fanos/collector.env | xargs)
python3 -m app.main
```

## Security Considerations

1. **Token Security**
   - The `SURICATA_INGEST_TOKEN` / `FANOS_SURICATA_TOKEN` is sensitive
   - File permissions: `chmod 600 /etc/fanos/collector.env`
   - Never commit tokens to Git
   - Rotate tokens periodically

2. **Network Isolation**
   - Host-Only network (192.168.56.0/24) is isolated from external networks
   - Ubuntu VM cannot access the internet through this interface
   - No port forwarding to external networks

3. **Service User**
   - Current setup runs collector as root (required for log access)
   - Consider creating dedicated `fanos-collector` user in production
   - Grant specific permissions to `/var/log/suricata/eve.json`

4. **Firewall Configuration**
   - Windows firewall rule allows port 8000 from any source
   - Consider restricting to Host-Only adapter IP range (192.168.56.0/24)

## Performance Notes

- **Polling Interval:** Default 1 second (configurable via `SURICATA_POLL_SECONDS`)
- **Retry Interval:** Default 5 seconds on backend failure
- **Deduplication Window:** 60 seconds (prevents duplicate events)
- **Correlation Window:** 300 seconds (groups related events)
- **State File:** Tracks up to 50,000 recent event IDs

## Files Modified Summary

| File | Type | Description |
|------|------|-------------|
| `backend/app/core/config.py` | Modified | Added Suricata token configuration |
| `backend/.env` | Modified | Added SURICATA_INGEST_TOKEN |
| `suricata-lab/collector/app/config.py` | Modified | Changed default sensor ID |
| `suricata-lab/collector/.env.ubuntu` | Created | Ubuntu environment template |
| `suricata-lab/collector/UBUNTU_DEPLOYMENT.md` | Created | Deployment guide |
| `suricata-lab/collector/fanos-suricata-collector.service` | Created | Systemd service file |
| `suricata-lab/collector/setup-ubuntu.sh` | Created | Automated setup script |
| `suricata-lab/collector/README.md` | Updated | Ubuntu architecture docs |
| `verify-suricata-backend.ps1` | Created | Backend verification script |
| `SURICATA_UBUNTU_MIGRATION.md` | Created | This migration summary |

## API Endpoints

### Suricata Event Ingestion
- **URL:** `http://192.168.56.1:8000/api/v1/suricata/events`
- **Method:** POST
- **Authentication:** Header `X-FANOS-Suricata-Token`
- **Body:** JSON event (see collector schema)
- **Response:** 202 Accepted

### Health Check
- **URL:** `http://192.168.56.1:8000/health`
- **Method:** GET
- **Authentication:** None
- **Response:** 200 OK

### Get Suricata Events
- **URL:** `http://192.168.56.1:8000/api/v1/suricata/events`
- **Method:** GET
- **Authentication:** Bearer token (user login)
- **Query Params:** `limit`, `hours`, `severity`
- **Response:** 200 OK with event list

### Get Suricata Stats
- **URL:** `http://192.168.56.1:8000/api/v1/suricata/stats`
- **Method:** GET
- **Authentication:** Bearer token (user login)
- **Query Params:** `hours`
- **Response:** 200 OK with statistics

## Support and Documentation

- **Main Documentation:** `suricata-lab/collector/UBUNTU_DEPLOYMENT.md`
- **Collector README:** `suricata-lab/collector/README.md`
- **Backend Verification:** `verify-suricata-backend.ps1`
- **GitHub Repository:** https://github.com/mulugeta24/-FANOS-AI

## Next Steps After Migration

1. Monitor collector logs for 24 hours to ensure stability
2. Verify events are appearing in SOC Dashboard
3. Test correlation and deduplication features
4. Configure alerting rules for critical Suricata signatures
5. Set up automated backups of collector state file
6. Consider creating automated tests for end-to-end flow
7. Document any organization-specific configuration changes
8. Train SOC team on new Ubuntu-based architecture

---

**Migration Date:** 2026-09-28  
**Migrated By:** FANOS AI Development Team  
**Status:** Configuration Complete - Awaiting Ubuntu Deployment  
**Version:** 1.0
