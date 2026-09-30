# FANOS Suricata Ubuntu Migration - Deployment Status

## Current Status: ✅ Windows Backend Ready | ⏳ Ubuntu Deployment Pending

---

## Completed (Windows Host)

### Backend Configuration ✅
- [x] Updated `backend/app/core/config.py` with Suricata token settings
- [x] Updated `backend/.env` with `SURICATA_INGEST_TOKEN=<REDACTED_TOKEN>`
- [x] Backend is running and responding at http://192.168.56.1:8000
- [x] Health endpoint verified: Service healthy, AI engine active
- [x] Database configuration: PostgreSQL on localhost
- [x] Redis configuration: redis://localhost:6379/0
- [x] Host-Only network configured: 192.168.56.1 on Ethernet 2

### API Endpoints ✅
- [x] Ingestion endpoint ready: `POST /api/v1/suricata/events`
- [x] Authentication mechanism ready: `X-FANOS-Suricata-Token` header
- [x] Deduplication enabled: 60-second window
- [x] Correlation enabled: 300-second window, max 100 events

### Documentation ✅
- [x] Created comprehensive Ubuntu deployment guide: `suricata-lab/collector/UBUNTU_DEPLOYMENT.md`
- [x] Created automated setup script: `suricata-lab/collector/setup-ubuntu.sh`
- [x] Created systemd service file: `suricata-lab/collector/fanos-suricata-collector.service`
- [x] Created Ubuntu environment template: `suricata-lab/collector/.env.ubuntu`
- [x] Updated collector README: `suricata-lab/collector/README.md`
- [x] Created migration summary: `SURICATA_UBUNTU_MIGRATION.md`
- [x] Created verification script: `verify-suricata-backend.ps1`

### Collector Code ✅
- [x] Updated default sensor ID: `ubuntu-suricata-01`
- [x] Existing collector code compatible with Ubuntu paths
- [x] Authentication mechanism matches backend expectations
- [x] Event schema matches backend ingestion API

---

## Pending (Ubuntu VM)

### Prerequisites ⏳
- [ ] Ubuntu VM accessible at 192.168.56.104
- [ ] Suricata 8.0.7 installed and running
- [ ] Python 3.9+ installed
- [ ] Network connectivity to Windows host verified
- [ ] `/var/log/suricata/eve.json` exists and is being populated

### Deployment Steps ⏳
- [ ] Transfer collector files to Ubuntu VM
- [ ] Run `setup-ubuntu.sh` automated installation script
- [ ] Configure `/etc/fanos/collector.env` with authentication token
- [ ] Start `fanos-suricata-collector.service`
- [ ] Verify service is running and logs show successful forwarding
- [ ] Verify events appear in FANOS SOC Dashboard

### Windows Firewall ⚠️
- [ ] **ACTION REQUIRED:** Create firewall rule to allow Ubuntu connection
  ```powershell
  # Run as Administrator
  New-NetFirewallRule -DisplayName "FANOS Backend" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
  ```

---

## Quick Start Commands

### On Windows (Run as Administrator)

**1. Configure Windows Firewall:**
```powershell
New-NetFirewallRule -DisplayName "FANOS Backend" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
```

**2. Verify backend is running:**
```powershell
cd "c:\Fanos Aii\backend"
python run.py
```

**3. Test backend accessibility:**
```powershell
Invoke-RestMethod -Uri "http://192.168.56.1:8000/health"
```

### On Ubuntu VM

**1. Transfer collector files (choose one method):**

**Option A: Using Git**
```bash
git clone https://github.com/mulugeta24/-FANOS-AI.git
cd -FANOS-AI/suricata-lab/collector
```

**Option B: Using SCP (if SSH enabled)**
```bash
# From Windows (adjust path and username)
scp -r "c:\Fanos Aii\suricata-lab\collector" username@192.168.56.104:/tmp/
```

**2. Run automated setup:**
```bash
cd /tmp/collector  # or wherever you placed the files
sudo bash setup-ubuntu.sh
```

**3. Configure authentication token:**
```bash
sudo nano /etc/fanos/collector.env
```

Ensure this line matches the Windows backend token:
```
FANOS_SURICATA_TOKEN=<YOUR_SURICATA_INGEST_TOKEN>
```

**4. Start the collector:**
```bash
sudo systemctl start fanos-suricata-collector
sudo systemctl status fanos-suricata-collector
```

**5. Monitor logs:**
```bash
sudo journalctl -u fanos-suricata-collector -f
```

---

## Verification Checklist

### Step 1: Pre-Deployment Checks (Ubuntu)

```bash
# Check Suricata is running
sudo systemctl status suricata --no-pager

# Check Suricata version
sudo suricata --version

# Check EVE log exists and has alerts
sudo ls -lh /var/log/suricata/eve.json
sudo grep '"event_type":"alert"' /var/log/suricata/eve.json | tail -n 2

# Check network connectivity to Windows
curl -i http://192.168.56.1:8000/health
```

Expected output:
```
HTTP/1.1 200 OK
{"status":"healthy","service":"FANOS AI Backend","version":"1.0.0","ai_engine":"active"}
```

### Step 2: Post-Deployment Checks (Ubuntu)

```bash
# Check collector service is running
sudo systemctl status fanos-suricata-collector --no-pager

# Check collector logs for successful forwarding
sudo journalctl -u fanos-suricata-collector -n 20 --no-pager

# Look for: "INFO Forwarded Suricata alert <event_id>"
```

### Step 3: Backend Verification (Windows)

```powershell
# Check backend logs for received events
# Look for: "[DEDUP] New event accepted" and "[PERSIST] Suricata event stored successfully"

# Query database for Ubuntu sensor events
cd "c:\Fanos Aii"
# (Use PostgreSQL client or backend admin interface)
```

### Step 4: Dashboard Verification (Windows Browser)

1. Navigate to: http://localhost:3000
2. Login with admin credentials
3. Go to Security Events or Suricata Events page
4. Filter by sensor: `ubuntu-suricata-01`
5. Verify recent events are displayed

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FANOS AI Platform                            │
│                                                                      │
│  Ubuntu VM (192.168.56.104)          Windows Host (192.168.56.1)   │
│  ┌─────────────────────────┐         ┌──────────────────────────┐  │
│  │                         │         │                          │  │
│  │  Suricata 8.0.7         │         │  FANOS Backend :8000     │  │
│  │  ↓                      │         │  ├── PostgreSQL          │  │
│  │  /var/log/suricata/     │         │  ├── Redis               │  │
│  │  eve.json               │         │  ├── AI/ML Engine        │  │
│  │  ↓                      │         │  ├── Rule Engine         │  │
│  │  FANOS Collector        │─HTTP──→ │  ├── Risk Engine         │  │
│  │  - Read EVE JSON        │  POST   │  ├── Correlation         │  │
│  │  - Parse alerts         │  +Auth  │  └── Deduplication       │  │
│  │  - Normalize events     │         │                          │  │
│  │  - Send to backend      │         │  Frontend :3000          │  │
│  │                         │         │  └── SOC Dashboard       │  │
│  └─────────────────────────┘         └──────────────────────────┘  │
│                                                                      │
│  Network: VirtualBox Host-Only (192.168.56.0/24)                   │
│  Authentication: SURICATA_INGEST_TOKEN (shared secret)              │
│  Protocol: HTTP POST with JSON payload                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Important Configuration Values

| Setting | Location | Value |
|---------|----------|-------|
| **Backend URL** | Ubuntu Collector | `http://192.168.56.1:8000/api/v1/suricata/events` |
| **Auth Token** | Windows Backend `.env` | `SURICATA_INGEST_TOKEN=<YOUR_TOKEN>` |
| **Auth Token** | Ubuntu Collector `.env` | `FANOS_SURICATA_TOKEN=<YOUR_TOKEN>` |
| **Sensor ID** | Ubuntu Collector | `ubuntu-suricata-01` |
| **EVE Log Path** | Ubuntu Collector | `/var/log/suricata/eve.json` |
| **State File** | Ubuntu Collector | `/var/lib/fanos/collector-state.json` |
| **Poll Interval** | Ubuntu Collector | `1` second |
| **Retry Interval** | Ubuntu Collector | `5` seconds |
| **Dedup Window** | Backend | `60` seconds |
| **Correlation Window** | Backend | `300` seconds |

---

## Troubleshooting Quick Reference

| Issue | Symptom | Solution |
|-------|---------|----------|
| **Token Mismatch** | HTTP 401 Unauthorized | Compare tokens on both systems, ensure exact match |
| **Backend Unreachable** | Connection refused | Check Windows Firewall rule, verify backend is running |
| **No Events Forwarded** | Empty collector logs | Check Suricata is generating alerts, verify EVE log path |
| **Service Won't Start** | Systemd failure | Check logs: `sudo journalctl -u fanos-suricata-collector -n 50` |
| **Events Not in Dashboard** | Missing in UI | Check backend logs, verify database connection, check organization/asset mapping |

---

## Documentation Reference

| Document | Purpose | Location |
|----------|---------|----------|
| **Deployment Guide** | Comprehensive Ubuntu deployment | `suricata-lab/collector/UBUNTU_DEPLOYMENT.md` |
| **Setup Script** | Automated installation | `suricata-lab/collector/setup-ubuntu.sh` |
| **Collector README** | Quick start and configuration | `suricata-lab/collector/README.md` |
| **Migration Summary** | Architecture changes | `SURICATA_UBUNTU_MIGRATION.md` |
| **Backend Verification** | Windows readiness check | `verify-suricata-backend.ps1` |
| **Deployment Status** | Current status (this file) | `DEPLOYMENT_STATUS.md` |

---

## Support

For issues during deployment:

1. **Review documentation:** See `suricata-lab/collector/UBUNTU_DEPLOYMENT.md`
2. **Check logs:**
   - Ubuntu: `sudo journalctl -u fanos-suricata-collector -f`
   - Windows: Backend console output
3. **Verify connectivity:** `curl -i http://192.168.56.1:8000/health` (from Ubuntu)
4. **Check configuration:** Compare tokens between Windows and Ubuntu
5. **GitHub repository:** https://github.com/mulugeta24/-FANOS-AI

---

**Status:** Windows configuration complete, ready for Ubuntu deployment  
**Last Updated:** 2026-09-28  
**Next Action:** Deploy collector on Ubuntu VM following UBUNTU_DEPLOYMENT.md
