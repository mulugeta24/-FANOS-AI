# FANOS AI — Network Security Lab Guide & Runbook

This comprehensive guide covers how to start the full FANOS AI system, simulate real cyber attacks from Kali Linux, query and manage the PostgreSQL database, and troubleshoot the end-to-end network IDS pipeline.

---

## 1. Network Topology & Architecture

```text
┌─────────────────────────────────┐        ┌─────────────────────────────────────────────────────┐
│       KALI LINUX (Attacker)     │        │                  UBUNTU VM (Victim)                 │
│  IP: 192.168.56.104 (or dynamic)│        │  Target Interface (enp0s3): 192.168.56.102          │
│  Tools: nmap, hydra, hping3     │───────>│  Uplink Interface (enp0s8): 192.168.56.101          │
└─────────────────────────────────┘        │  Services:                                          │
                                           │   - Suricata 7.x (Sniffing enp0s3/enp0s8)           │
                                           │   - fanos-suricata-collector (Tailing eve.json)     │
                                           │   - Web Service (Port 80) & OpenSSH (Port 22)       │
                                           └──────────────────────────┬──────────────────────────┘
                                                                      │ EVE JSON Stream
                                                                      │ (HTTP POST + Bearer Token)
                                                                      ▼
                                           ┌─────────────────────────────────────────────────────┐
                                           │              WINDOWS HOST (FANOS Engine)            │
                                           │  Host IP on VirtualBox Adapter: 192.168.56.1        │
                                           │                                                     │
                                           │  Docker Containers:                                 │
                                           │   - fanos-frontend : http://localhost:3000 (React)  │
                                           │   - fanos-backend  : http://localhost:8000 (FastAPI)│
                                           │   - fanos-db       : Port 5432 (PostgreSQL 15)      │
                                           │   - fanos-redis    : Port 6379 (Redis 7)            │
                                           │                                                     │
                                           │  AI Pipeline:                                       │
                                           │   - XGBoost Native Flow Classifier (16D Champion)   │
                                           │   - Deterministic Risk Engine (0 - 100 Score)       │
                                           └─────────────────────────────────────────────────────┘
```

---

## 2. How to Start the System

### Step 1: Start FANOS on Windows Host
Open PowerShell inside `d:\fanos ai\-FANOS-AI` and start all containers:

```powershell
# 1. Start Docker containers
docker compose up -d

# 2. Verify all 4 containers are healthy
docker ps
```

You should see:
* `fanos-frontend` (Port `3000`)
* `fanos-backend` (Port `8000`)
* `fanos-db` (Port `5432`)
* `fanos-redis` (Port `6379`)

Access the dashboard in your browser:
* **SecOps Suricata Page:** [http://localhost:3000/secops/network/suricata](http://localhost:3000/secops/network/suricata)
* **API Documentation (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Step 2: Start Services on Ubuntu Victim VM (`192.168.56.102`)

Log into your Ubuntu VM and ensure victim services, Suricata, and the collector agent are running:

```bash
# 1. Start victim web server on port 80 (Pick either Python or Nginx)
sudo python3 -m http.server 80 &
# OR: sudo systemctl start nginx

# 2. Ensure SSH server is running on port 22
sudo systemctl enable --now ssh

# 3. Allow ports through the firewall
sudo ufw allow 80/tcp
sudo ufw allow 22/tcp

# 4. Restart Suricata IDS Daemon
sudo systemctl restart suricata

# 5. Restart FANOS Ingestion Collector Agent
sudo systemctl restart fanos-suricata-collector
```

To verify the collector is actively shipping logs:
```bash
sudo systemctl status fanos-suricata-collector --no-pager
```

---

## 3. How to Simulate Attacks from Kali Linux

From your **Kali Linux terminal**, launch any of the following attacks against target `192.168.56.102`:

### Attack A: Nmap TCP SYN Port Reconnaissance
Scans high-risk ports; triggers Suricata `ET SCAN` signatures without needing any open ports:
```bash
nmap -sS -p 21,22,80,443,8080,3306 192.168.56.102
```
* **Dashboard Classification:** `Network Reconnaissance` (Risk Score: ~75)

---

### Attack B: Hydra SSH Credential Brute Force
Tests common password dictionaries against port 22:
```bash
hydra -l root -P /usr/share/wordlists/metasploit/unix_passwords.txt ssh://192.168.56.102 -t 4
```
* **Dashboard Classification:** `SSH / Brute Force` (Risk Score: ~90)

---

### Attack C: Web Application Attacks & SQL Injection (Port 80)
Sends automated scanner headers and SQL injection payloads:
```bash
# 1. Automated scanner signature (sqlmap User-Agent)
curl -A "sqlmap/1.6" http://192.168.56.102/

# 2. SQL Injection attempt
curl "http://192.168.56.102/?id=1%27%20OR%201=1--"

# 3. Custom FANOS lab verification probe
curl "http://192.168.56.102/fanos-suricata-test"
```
* **Dashboard Classification:** `Web Application Attack` / `FANOS LAB HTTP TEST ALERT`

---

### Attack D: Distributed Denial of Service (DDoS) / SYN Flood
Simulates a high-rate botnet TCP SYN flood using randomized source IPs:
```bash
# Run for 3-5 seconds, then press Ctrl+C to stop
sudo hping3 -S -p 80 --flood --rand-source 192.168.56.102
```
* **Dashboard Classification:** `DDoS Attack` (Risk Score: 100/100, Critical Severity)

---

### Attack E: High-Rate UDP Flood (DDoS)
Saturates UDP port capacity:
```bash
# Run for 3-5 seconds, then press Ctrl+C
sudo hping3 --udp -p 80 --flood 192.168.56.102
```
* **Dashboard Classification:** `DDoS Attack`

---

### Attack F: Line-Rate ICMP Ping Flood
```bash
sudo hping3 --icmp --flood 192.168.56.102
```
* **Dashboard Classification:** `ICMP Ping / Flood Detection`

---

## 4. How to Access the PostgreSQL Database

### Option 1: Command Line via Docker (Fastest)

Run `psql` directly inside the running container from PowerShell on Windows:

```powershell
docker exec -it fanos-db psql -U fanos -d fanos_db
```

---

### Option 2: GUI Database Tools (DBeaver, pgAdmin, DataGrip, VS Code)

Connect using these credentials:
* **Host:** `localhost` (or `127.0.0.1`)
* **Port:** `5432`
* **Database:** `fanos_db`
* **Username:** `fanos`
* **Password:** `fanos_pass`
* **SSL Mode:** `disable`

---

### Useful SQL Queries

#### 1. View the 10 Most Recent Security Events with Full Telemetry
```sql
SELECT 
    created_at,
    client_ip,
    hostname,
    method,
    path,
    decision,
    action,
    severity,
    ai_confidence,
    risk_score,
    attack_type
FROM security_events
ORDER BY COALESCE(timestamp, created_at) DESC
LIMIT 10;
```

#### 2. Count Events Grouped by Threat / Attack Type
```sql
SELECT 
    attack_type, 
    count(*) AS total_hits,
    round(avg(risk_score), 1) AS avg_risk,
    round(avg(ai_confidence)::numeric, 1) AS avg_ml_confidence
FROM security_events
GROUP BY attack_type
ORDER BY total_hits DESC;
```

#### 3. Top 5 Attacking IP Addresses
```sql
SELECT 
    source_ip, 
    count(*) AS hit_count, 
    max(severity) AS highest_severity
FROM security_events
GROUP BY source_ip
ORDER BY hit_count DESC
LIMIT 5;
```

#### 4. Inspect the Raw JSON Telemetry Payload of the Latest Event
```sql
SELECT raw_payload 
FROM security_events 
ORDER BY id DESC 
LIMIT 1;
```

---

## 5. Troubleshooting & Useful Operational Tips

### 1. Truncate Old Logs on Ubuntu (Fresh Start)
If `/var/log/suricata/eve.json` accumulates thousands of old packets from previous days, reset it so only fresh packets appear:
```bash
# On Ubuntu VM:
sudo truncate -s 0 /var/log/suricata/eve.json
sudo rm -f /var/lib/fanos/collector-state.json
sudo systemctl restart fanos-suricata-collector
```

### 2. Verify Live Packet Arrival with `tcpdump`
If an attack command does not alert, check if the Ubuntu kernel actually receives the packets:
```bash
# On Ubuntu VM:
sudo tcpdump -ni enp0s3 "tcp port 80 or tcp port 22 or icmp"
```

### 3. Check Which Network Interface Suricata Sniffs
Suricata must listen on the interface receiving the traffic (`enp0s3`):
```bash
# View active interface
ps aux | grep suricata

# To change default interface in Ubuntu:
sudo nano /etc/default/suricata
# Ensure: IFACE=enp0s3
sudo systemctl restart suricata
```

### 4. Restarting FANOS Windows Services
If backend code or database rules are modified:
```powershell
# Restart backend
docker restart fanos-backend

# Restart frontend
docker restart fanos-frontend

# View live backend application logs
docker logs fanos-backend -f
```

---

## 6. Key Configuration Values & Tokens

| Component | Setting / Location | Value |
| :--- | :--- | :--- |
| **Collector Token** | `X-Fanos-Suricata-Token` | `ce8eb0468b7d7f8ad89b02b27271e364fbb60518ae194f43c95c6c62addfd318` |
| **Backend Ingest URL** | `API_ENDPOINT` | `http://192.168.56.1:8000/api/v1/suricata/events` |
| **Backend Flow URL** | `FLOW_ENDPOINT` | `http://192.168.56.1:8000/api/v1/suricata/flows` |
| **PostgreSQL DB** | Docker Container | `fanos-db:5432` (`fanos_db` / `fanos` / `fanos_pass`) |
| **Frontend Web** | Docker Container | `http://localhost:3000` |
