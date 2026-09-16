# FANOS AI - Complete Database Structure

## Overview
FANOS AI uses **PostgreSQL** as the primary database with **SQLAlchemy ORM** and **Alembic** for migrations.

---

## Database Tables

### 1. **users** - User Management & Authentication

Stores SOC analysts, administrators, and system users.

| Column        | Type                  | Constraints           | Description                           |
|---------------|----------------------|----------------------|---------------------------------------|
| id            | UUID                 | PRIMARY KEY          | Unique user identifier                |
| username      | VARCHAR(64)          | UNIQUE, NOT NULL     | Login username                        |
| email         | VARCHAR(256)         | UNIQUE, NOT NULL     | User email address                    |
| full_name     | VARCHAR(128)         | NOT NULL             | Full name of user                     |
| hashed_pwd    | VARCHAR(256)         | NOT NULL             | Bcrypt hashed password                |
| role          | VARCHAR(32)          | NOT NULL, DEFAULT 'analyst' | User role (admin, analyst, viewer) |
| is_active     | BOOLEAN              | NOT NULL, DEFAULT TRUE | Account active status              |
| mfa_enabled   | BOOLEAN              | NOT NULL, DEFAULT FALSE | Multi-factor authentication status |
| created_at    | TIMESTAMP WITH TZ    | DEFAULT now()        | Account creation timestamp            |
| last_login    | TIMESTAMP WITH TZ    | NULL                 | Last successful login                 |

**Indexes:**
- `username` (UNIQUE)
- `email` (UNIQUE)

**Sample Data:**
```sql
INSERT INTO users (username, email, full_name, role) VALUES
('admin', 'admin@fanos.ai', 'System Administrator', 'admin'),
('analyst1', 'analyst@fanos.ai', 'SOC Analyst', 'analyst');
```

---

### 2. **security_events** - Real-Time Threat Events

Stores every detected security event from all sensors (Suricata, ModSecurity, Wazuh).

| Column        | Type                  | Constraints           | Description                           |
|---------------|----------------------|----------------------|---------------------------------------|
| id            | UUID                 | PRIMARY KEY          | Unique event identifier               |
| severity      | VARCHAR(16)          | NOT NULL, INDEXED    | CRITICAL, HIGH, MEDIUM, LOW, INFO    |
| attack_type   | VARCHAR(128)         | NOT NULL             | SQL Injection, XSS, DDoS, Brute Force, etc. |
| source_ip     | VARCHAR(64)          | NOT NULL, INDEXED    | Attacker IP address                   |
| target        | VARCHAR(256)         | NOT NULL             | Target system/endpoint                |
| ai_confidence | FLOAT                | NOT NULL             | AI prediction confidence (0.0-1.0)    |
| risk_score    | INTEGER              | NOT NULL, INDEXED    | Composite risk score (0-100)          |
| status        | VARCHAR(32)          | NOT NULL, DEFAULT 'ALERT' | ALERT, INVESTIGATING, RESOLVED    |
| raw_payload   | TEXT                 | NULL                 | Raw attack payload/log                |
| sensor_source | VARCHAR(64)          | NULL                 | suricata, zeek, waf, wazuh            |
| created_at    | TIMESTAMP WITH TZ    | DEFAULT now(), INDEXED | Event timestamp                     |
| incident_id   | UUID                 | FOREIGN KEY (incidents.id) | Linked incident (if escalated)    |

**Indexes:**
- `severity`
- `source_ip`
- `risk_score`
- `created_at`

**Relationships:**
- `incident` → Many-to-One with `incidents`

**Sample Data:**
```sql
INSERT INTO security_events (severity, attack_type, source_ip, target, ai_confidence, risk_score, sensor_source) VALUES
('CRITICAL', 'SQL Injection', '192.168.1.100', '/api/users', 0.98, 96, 'waf'),
('HIGH', 'Brute Force', '10.0.0.50', 'ssh://server1', 0.95, 88, 'suricata');
```

---

### 3. **incidents** - Security Incidents

Aggregates related security events into actionable incidents for SOC investigation.

| Column        | Type                  | Constraints           | Description                           |
|---------------|----------------------|----------------------|---------------------------------------|
| id            | UUID                 | PRIMARY KEY          | Unique incident identifier            |
| title         | VARCHAR(256)         | NOT NULL             | Incident title/summary                |
| threat        | VARCHAR(128)         | NOT NULL             | Primary threat type                   |
| severity      | VARCHAR(16)          | NOT NULL, INDEXED    | CRITICAL, HIGH, MEDIUM, LOW          |
| source_ip     | VARCHAR(64)          | NOT NULL             | Primary attacker IP                   |
| status        | VARCHAR(32)          | NOT NULL, DEFAULT 'Open', INDEXED | Open, Investigating, Resolved, False Positive |
| risk_score    | INTEGER              | NOT NULL             | Highest risk score from events        |
| assigned_to   | VARCHAR(128)         | NULL                 | Assigned SOC analyst                  |
| description   | TEXT                 | NULL                 | Detailed incident description         |
| created_at    | TIMESTAMP WITH TZ    | DEFAULT now(), INDEXED | Incident creation time              |
| resolved_at   | TIMESTAMP WITH TZ    | NULL                 | Resolution timestamp                  |

**Indexes:**
- `severity`
- `status`
- `created_at`

**Relationships:**
- `events` → One-to-Many with `security_events`
- `actions` → One-to-Many with `response_actions`

**Sample Data:**
```sql
INSERT INTO incidents (title, threat, severity, source_ip, status, risk_score, assigned_to) VALUES
('SQL Injection Campaign Detected', 'SQL Injection', 'CRITICAL', '192.168.1.100', 'Investigating', 96, 'analyst1'),
('DDoS Attack on Web Server', 'DDoS', 'HIGH', '203.0.113.50', 'Open', 92, NULL);
```

---

### 4. **response_actions** - Automated & Manual Response

Records all response actions taken by FANOS AI or SOC team.

| Column        | Type                  | Constraints           | Description                           |
|---------------|----------------------|----------------------|---------------------------------------|
| id            | UUID                 | PRIMARY KEY          | Unique action identifier              |
| action        | VARCHAR(64)          | NOT NULL             | Blocked IP, WAF Rule, Rate Limit, etc. |
| target        | VARCHAR(256)         | NOT NULL             | Target of action (IP, rule ID, etc.)  |
| reason        | VARCHAR(256)         | NOT NULL             | Reason for action                     |
| automated     | BOOLEAN              | NOT NULL, DEFAULT TRUE | Automated vs manual action          |
| created_at    | TIMESTAMP WITH TZ    | DEFAULT now(), INDEXED | Action timestamp                    |
| incident_id   | UUID                 | FOREIGN KEY (incidents.id) | Related incident                   |

**Indexes:**
- `created_at`

**Relationships:**
- `incident` → Many-to-One with `incidents`

**Sample Data:**
```sql
INSERT INTO response_actions (action, target, reason, automated, incident_id) VALUES
('Blocked IP', '192.168.1.100', 'SQL Injection attack detected', TRUE, '<incident_uuid>'),
('WAF Rule Deployed', 'Rule #1234', 'Block XSS payload pattern', TRUE, '<incident_uuid>');
```

---

### 5. **blocked_ips** - IP Blacklist Management

Active IP address blocklist maintained by FANOS AI.

| Column        | Type                  | Constraints           | Description                           |
|---------------|----------------------|----------------------|---------------------------------------|
| id            | UUID                 | PRIMARY KEY          | Unique block record identifier        |
| ip_address    | VARCHAR(64)          | UNIQUE, NOT NULL, INDEXED | Blocked IP address               |
| reason        | VARCHAR(256)         | NOT NULL             | Reason for blocking                   |
| blocked_by    | VARCHAR(64)          | NOT NULL, DEFAULT 'FANOS AI' | System or analyst who blocked  |
| expires_at    | TIMESTAMP WITH TZ    | NULL                 | Block expiration (NULL = permanent)   |
| created_at    | TIMESTAMP WITH TZ    | DEFAULT now(), INDEXED | Block creation time                |
| is_active     | BOOLEAN              | NOT NULL, DEFAULT TRUE, INDEXED | Active block status           |

**Indexes:**
- `ip_address` (UNIQUE)
- `is_active`
- `created_at`

**Sample Data:**
```sql
INSERT INTO blocked_ips (ip_address, reason, blocked_by, expires_at, is_active) VALUES
('192.168.1.100', 'SQL Injection attack', 'FANOS AI', NULL, TRUE),
('10.0.0.50', 'Brute force attempt', 'analyst1', '2026-09-20 00:00:00+00', TRUE);
```

---

## Additional Tables (Planned/Future)

### 6. **threat_intelligence** - Threat Intel Feeds

| Column        | Type                  | Description                           |
|---------------|----------------------|---------------------------------------|
| id            | UUID                 | PRIMARY KEY                           |
| ioc_type      | VARCHAR(32)          | IP, Domain, Hash, URL                 |
| ioc_value     | VARCHAR(512)         | Actual indicator value                |
| threat_type   | VARCHAR(128)         | Malware, C2, Phishing, etc.           |
| confidence    | FLOAT                | Confidence level (0.0-1.0)            |
| source        | VARCHAR(128)         | Intel source (VirusTotal, etc.)       |
| first_seen    | TIMESTAMP WITH TZ    | First detection                       |
| last_seen     | TIMESTAMP WITH TZ    | Last detection                        |

---

### 7. **sensors** - Security Sensor Registry

| Column        | Type                  | Description                           |
|---------------|----------------------|---------------------------------------|
| id            | UUID                 | PRIMARY KEY                           |
| name          | VARCHAR(128)         | Sensor name                           |
| type          | VARCHAR(32)          | suricata, zeek, waf, wazuh            |
| hostname      | VARCHAR(256)         | Sensor hostname/IP                    |
| status        | VARCHAR(32)          | online, offline, error                |
| version       | VARCHAR(64)          | Sensor version                        |
| last_heartbeat| TIMESTAMP WITH TZ    | Last health check                     |
| created_at    | TIMESTAMP WITH TZ    | Registration time                     |

---

### 8. **audit_logs** - System Audit Trail

| Column        | Type                  | Description                           |
|---------------|----------------------|---------------------------------------|
| id            | UUID                 | PRIMARY KEY                           |
| user_id       | UUID                 | FOREIGN KEY (users.id)                |
| action        | VARCHAR(128)         | Action performed                      |
| resource      | VARCHAR(256)         | Affected resource                     |
| ip_address    | VARCHAR(64)          | User IP address                       |
| user_agent    | TEXT                 | Browser/client info                   |
| result        | VARCHAR(32)          | success, failure                      |
| created_at    | TIMESTAMP WITH TZ    | Action timestamp                      |

---

### 9. **ai_predictions** - AI Model Predictions Log

| Column        | Type                  | Description                           |
|---------------|----------------------|---------------------------------------|
| id            | UUID                 | PRIMARY KEY                           |
| event_id      | UUID                 | FOREIGN KEY (security_events.id)      |
| model_name    | VARCHAR(128)         | XGBoost V3, etc.                      |
| model_version | VARCHAR(32)          | Model version                         |
| prediction    | VARCHAR(128)         | Predicted attack class                |
| confidence    | FLOAT                | Prediction confidence (0.0-1.0)       |
| features      | JSONB                | Feature values used                   |
| inference_time| FLOAT                | Prediction latency (ms)               |
| created_at    | TIMESTAMP WITH TZ    | Prediction timestamp                  |

---

### 10. **correlation_rules** - Threat Correlation Rules

| Column        | Type                  | Description                           |
|---------------|----------------------|---------------------------------------|
| id            | UUID                 | PRIMARY KEY                           |
| name          | VARCHAR(256)         | Rule name                             |
| description   | TEXT                 | Rule description                      |
| conditions    | JSONB                | Correlation conditions (JSON)         |
| severity      | VARCHAR(16)          | Rule severity                         |
| enabled       | BOOLEAN              | Rule enabled status                   |
| created_at    | TIMESTAMP WITH TZ    | Rule creation time                    |

---

## Entity Relationships

```
users (1) ──────────── (*) audit_logs
                        
incidents (1) ──────── (*) security_events
          (1) ──────── (*) response_actions

security_events (*) ── (1) incidents [optional]

blocked_ips [independent table]

sensors [independent table]

threat_intelligence [independent table]

ai_predictions (*) ──── (1) security_events
```

---

## Database Indexes Summary

### Performance-Critical Indexes:

1. **security_events**
   - `ix_security_events_created_at` - Time-series queries
   - `ix_security_events_source_ip` - IP-based filtering
   - `ix_security_events_severity` - Priority filtering
   - `ix_security_events_risk_score` - Risk-based queries

2. **incidents**
   - `ix_incidents_status` - Active incident queries
   - `ix_incidents_severity` - Priority filtering
   - `ix_incidents_created_at` - Time-series queries

3. **blocked_ips**
   - `ix_blocked_ips_ip_address` - Fast IP lookup (UNIQUE)
   - `ix_blocked_ips_is_active` - Active blocks only

4. **users**
   - `ix_users_username` - Login lookup (UNIQUE)
   - `ix_users_email` - Email lookup (UNIQUE)

---

## Database Connection Configuration

**PostgreSQL Connection String:**
```
postgresql://fanos_user:secure_password@localhost:5432/fanos_ai
```

**Environment Variables:**
```bash
DATABASE_URL=postgresql://fanos_user:secure_password@localhost:5432/fanos_ai
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10
DB_POOL_TIMEOUT=30
```

**SQLAlchemy Engine Settings:**
```python
engine = create_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=3600,
    echo=False
)
```

---

## Backup & Retention Policy

### Backup Strategy:
- **Full backup**: Daily at 2:00 AM UTC
- **Incremental backup**: Every 6 hours
- **Transaction logs**: Continuous archiving
- **Retention**: 30 days online, 1 year archive

### Data Retention:
- **security_events**: 90 days (hot), 1 year (cold), 3 years (archive)
- **incidents**: 2 years
- **blocked_ips**: Permanent (with cleanup of expired/inactive)
- **audit_logs**: 1 year
- **ai_predictions**: 180 days

---

## Migration Management

**Alembic Commands:**
```bash
# Create new migration
alembic revision -m "description"

# Run migrations
alembic upgrade head

# Rollback one version
alembic downgrade -1

# Show current version
alembic current

# Show migration history
alembic history
```

**Migration File Location:**
```
backend/alembic/versions/
└── 001_initial_schema.py
```

---

## Database Initialization

**Step 1: Create Database**
```sql
CREATE DATABASE fanos_ai;
CREATE USER fanos_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE fanos_ai TO fanos_user;
```

**Step 2: Run Migrations**
```bash
cd backend
alembic upgrade head
```

**Step 3: Seed Initial Data (Optional)**
```bash
python -m app.scripts.seed_data
```

---

## Query Performance Guidelines

### Best Practices:

1. **Use indexes** for WHERE, ORDER BY, and JOIN columns
2. **Limit result sets** with LIMIT/OFFSET for pagination
3. **Use EXISTS** instead of COUNT(*) for existence checks
4. **Partition large tables** (security_events) by date
5. **Use connection pooling** to reduce connection overhead
6. **Monitor slow queries** with `pg_stat_statements`

### Example Optimized Queries:

**Get recent critical events:**
```sql
SELECT * FROM security_events 
WHERE severity = 'CRITICAL' 
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;
```

**Count active incidents by severity:**
```sql
SELECT severity, COUNT(*) 
FROM incidents 
WHERE status IN ('Open', 'Investigating')
GROUP BY severity;
```

**Find blocked IPs expiring soon:**
```sql
SELECT ip_address, expires_at 
FROM blocked_ips 
WHERE is_active = TRUE 
  AND expires_at IS NOT NULL
  AND expires_at < NOW() + INTERVAL '7 days'
ORDER BY expires_at ASC;
```

---

## Database Monitoring

### Key Metrics to Monitor:

1. **Connection Pool**
   - Active connections
   - Idle connections
   - Pool exhaustion events

2. **Query Performance**
   - Average query time
   - Slow queries (>1 second)
   - Query cache hit rate

3. **Table Statistics**
   - Table size growth
   - Index usage
   - Dead tuple count

4. **Replication Lag** (if using replication)
   - Primary-replica delay
   - Replication errors

---

## Security Considerations

### Database Security:

1. **Encryption at Rest**: Enable PostgreSQL encryption
2. **Encryption in Transit**: Use SSL/TLS connections
3. **Password Policy**: Strong passwords with rotation
4. **Least Privilege**: Grant minimum required permissions
5. **Audit Logging**: Enable PostgreSQL audit logs
6. **IP Whitelisting**: Restrict database access by IP
7. **Regular Updates**: Keep PostgreSQL patched

### Connection Security:
```python
# Use SSL for production
DATABASE_URL = "postgresql://user:pass@host:5432/db?sslmode=require"
```

---

## Disaster Recovery

### Recovery Procedures:

1. **Point-in-Time Recovery (PITR)**
   - Restore from base backup
   - Replay transaction logs
   - Target specific timestamp

2. **Failover Process**
   - Promote replica to primary
   - Update application connection strings
   - Verify data consistency

3. **Data Corruption Recovery**
   - Identify corrupted tables
   - Restore from last known good backup
   - Re-apply recent transactions

---

## Scaling Considerations

### Horizontal Scaling:
- **Read replicas** for reporting/analytics
- **Partitioning** for large tables (by date/severity)
- **Sharding** by organization (multi-tenant)

### Vertical Scaling:
- Increase PostgreSQL memory (`shared_buffers`, `work_mem`)
- Use faster storage (NVMe SSD)
- Optimize vacuum and autovacuum settings

---

## Contact & Support

For database-related issues or questions:
- **Email**: database@fanos.ai
- **Documentation**: https://docs.fanos.ai/database
- **GitHub Issues**: https://github.com/fanos-ai/platform/issues

---

**Last Updated**: September 12, 2026  
**Database Version**: PostgreSQL 14+  
**Schema Version**: 001 (Initial)
