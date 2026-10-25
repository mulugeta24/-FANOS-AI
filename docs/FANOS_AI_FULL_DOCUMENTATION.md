# FANOS AI — Full Project Documentation

**Version:** 1.0.0  
**Built by:** Mulugeta Ababi  
**Stack:** FastAPI · XGBoost · React · PostgreSQL · Redis · Suricata · ModSecurity

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Repository Structure](#4-repository-structure)
5. [Backend](#5-backend)
   - 5.1 [Application Entry Point](#51-application-entry-point)
   - 5.2 [Configuration](#52-configuration)
   - 5.3 [Database Models](#53-database-models)
   - 5.4 [API Routes](#54-api-routes)
   - 5.5 [AI / ML Engine](#55-ai--ml-engine)
   - 5.6 [WAF Engine](#56-waf-engine)
   - 5.7 [Database Migrations](#57-database-migrations)
6. [Frontend](#6-frontend)
   - 6.1 [Pages](#61-pages)
   - 6.2 [Components](#62-components)
7. [Suricata IDS Integration](#7-suricata-ids-integration)
   - 7.1 [Architecture](#71-architecture)
   - 7.2 [Collector](#72-collector)
   - 7.3 [Event Flow](#73-event-flow)
8. [WAF (Web Application Firewall)](#8-waf-web-application-firewall)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Infrastructure & Deployment](#10-infrastructure--deployment)
    - 10.1 [Docker Compose](#101-docker-compose)
    - 10.2 [Running Locally (Development)](#102-running-locally-development)
11. [Environment Variables](#11-environment-variables)
12. [API Reference](#12-api-reference)
13. [Data Flow: End-to-End](#13-data-flow-end-to-end)
14. [Security Design](#14-security-design)
15. [Known Issues & Status](#15-known-issues--status)

---

## 1. Project Overview

FANOS AI is a unified AI-powered cybersecurity platform designed for Security Operations Center (SOC) use. It combines multiple security disciplines into a single integrated system:

| Capability | Description |
|---|---|
| **Intrusion Detection (IDS)** | Suricata 8.0.7 on Ubuntu VM, streaming alerts to the FANOS backend |
| **Web Application Firewall (WAF)** | ModSecurity + OWASP CRS + 17 custom FANOS rules |
| **AI Threat Detection** | XGBoost V3 model (99.87% accuracy) for network flow classification |
| **URL Threat Detection** | ML + VirusTotal integration for malicious URL detection |
| **Vulnerability Scanner** | Asset-scoped web vulnerability scanner |
| **Risk Engine** | Composite risk scoring combining AI confidence, rules, and asset criticality |
| **Correlation Engine** | Groups related events into attack campaigns |
| **SOC Dashboard** | Real-time React dashboard for analysts and administrators |
| **Sensor Lifecycle Management** | Full lifecycle control (start/stop/restart) for remote sensors |
| **Customer Portal** | Multi-tenant portal for customers to manage assets and service requests |

---

## 2. Architecture

### High-Level Diagram

```
Internet / Lab Traffic
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FANOS AI Platform (Windows 11 Host)          │
│                                                                   │
│  ┌───────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │ React Frontend│   │  FANOS WAF   │   │  Backend API     │   │
│  │ (Vite + TS)   │   │ (ModSecurity │   │  (FastAPI :8000) │   │
│  │   :3000       │──▶│  + OWASP CRS)│──▶│                  │   │
│  └───────────────┘   └──────────────┘   │  ┌────────────┐  │   │
│                                          │  │ AI Engine  │  │   │
│  ┌───────────────────────────────────┐  │  │ (XGBoost)  │  │   │
│  │         Ubuntu VM                 │  │  └────────────┘  │   │
│  │  ┌──────────────┐                 │  │  ┌────────────┐  │   │
│  │  │ Suricata 8.0 │─▶ eve.json      │  │  │ Rule Engine│  │   │
│  │  └──────────────┘                 │  │  └────────────┘  │   │
│  │  ┌──────────────┐                 │  │  ┌────────────┐  │   │
│  │  │  Collector   │──HTTP POST ────▶│  │  │ Risk Engine│  │   │
│  │  └──────────────┘   /suricata/    │  │  └────────────┘  │   │
│  │  (192.168.56.104)   events        │  └──────────────────┘   │
│  └───────────────────────────────────┘          │               │
│                                                  ▼               │
│                                    ┌────────────────────────┐   │
│                                    │ PostgreSQL :5432        │   │
│                                    │ Redis      :6379        │   │
│                                    └────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Network

| Component | Host | IP | Port |
|---|---|---|---|
| FANOS Backend | Windows | 192.168.56.1 | 8000 |
| Frontend | Windows | 192.168.56.1 | 3000 |
| PostgreSQL | Windows | localhost | 5432 |
| Redis | Windows | localhost | 6379 |
| Suricata IDS | Ubuntu VM | 192.168.56.104 | — |
| Suricata Collector | Ubuntu VM | 192.168.56.104 | — |

---

## 3. Technology Stack

### Backend
| Package | Version | Purpose |
|---|---|---|
| FastAPI | ≥0.111 | REST API framework |
| Uvicorn | ≥0.29 | ASGI server |
| SQLAlchemy | ≥2.0.30 | Async ORM |
| Alembic | ≥1.13 | Database migrations |
| asyncpg | ≥0.29 | Async PostgreSQL driver |
| Pydantic | ≥2.7 | Data validation |
| pydantic-settings | ≥2.2 | Env-based configuration |
| python-jose | ≥3.3 | JWT authentication |
| passlib[bcrypt] | ≥1.7 | Password hashing |
| XGBoost | ≥2.1 | ML inference |
| scikit-learn | ≥1.5 | Feature engineering |
| numpy / pandas | ≥2.1 / ≥2.2 | Numerical processing |
| redis | ≥5.0 | Event deduplication / correlation |
| httpx | ≥0.27 | Async HTTP client |
| structlog | ≥24.1 | Structured logging |

### Frontend
| Package | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite | Build tool |
| React Router | Client-side routing |
| Tailwind CSS | Styling |
| Recharts | Dashboard charts |
| Lucide React | Icon set |
| Axios | HTTP client |

### Infrastructure
| Component | Technology |
|---|---|
| Database | PostgreSQL 16 (Alpine) |
| Cache / Pub-Sub | Redis 7 (Alpine) |
| IDS | Suricata 8.0.7 |
| WAF | ModSecurity + OWASP CRS |
| Containerisation | Docker + Docker Compose |

---

## 4. Repository Structure

```
c:\Fanos Aii\
├── backend/                        # FastAPI application
│   ├── app/
│   │   ├── main.py                 # Application entry point
│   │   ├── ai/                     # AI/ML subsystem
│   │   │   ├── engine.py           # Singleton FANOSAIEngine
│   │   │   ├── predictor.py        # XGBoost inference
│   │   │   ├── model_loader.py     # Model loading / hot-reload
│   │   │   ├── feature_extractor.py# 16-feature vector builder
│   │   │   ├── rule_engine.py      # Signature-based rules
│   │   │   ├── risk_engine.py      # Composite risk scoring
│   │   │   └── correlation_engine.py # Campaign correlation
│   │   ├── api/v1/                 # REST API routes
│   │   │   ├── auth.py             # Login / register / JWT
│   │   │   ├── dashboard.py        # SOC dashboard metrics
│   │   │   ├── events.py           # Security events CRUD
│   │   │   ├── incidents.py        # Incident management
│   │   │   ├── suricata_events.py  # Suricata IDS ingestion
│   │   │   ├── waf_events.py       # WAF event ingestion
│   │   │   ├── sensors.py          # Sensor lifecycle management
│   │   │   ├── assets.py           # Asset management
│   │   │   ├── scanner.py          # Vulnerability scanner
│   │   │   ├── threat_detection.py # URL threat detection
│   │   │   ├── prevention.py       # IP blocking / prevention
│   │   │   ├── ai_routes.py        # AI engine API
│   │   │   ├── infrastructure.py   # Infrastructure monitoring
│   │   │   ├── customer.py         # Customer portal APIs
│   │   │   ├── sms.py              # SMS alerting
│   │   │   └── web_security.py     # Web security APIs
│   │   ├── core/
│   │   │   ├── config.py           # Settings (pydantic-settings)
│   │   │   ├── auth.py             # JWT validation, principals
│   │   │   ├── security.py         # Password hashing helpers
│   │   │   └── logging.py          # structlog configuration
│   │   ├── db/
│   │   │   ├── base.py             # SQLAlchemy engine + session
│   │   │   └── init_db.py          # Table creation on startup
│   │   ├── models/
│   │   │   └── security.py         # All ORM models
│   │   ├── schemas/
│   │   │   └── security.py         # Pydantic I/O schemas
│   │   ├── services/
│   │   │   ├── suricata_service.py # Suricata helpers
│   │   │   ├── threat_detection/   # URL detector + VirusTotal
│   │   │   ├── scanner/            # Vulnerability scan engine
│   │   │   └── zeek/               # Zeek log parser (legacy)
│   │   └── waf/                    # Embedded WAF engine
│   │       ├── engine/             # Detection pipeline
│   │       ├── rules/              # OWASP + FANOS rules
│   │       ├── proxy/              # Reverse proxy
│   │       └── api/                # WAF management API
│   ├── alembic/                    # Database migrations
│   │   └── versions/               # 001–005 migration files
│   ├── models/                     # ML model artefacts
│   ├── requirements.txt
│   ├── run.py                      # Development server (uvicorn)
│   └── Dockerfile
├── frontend/                       # React + TypeScript SPA
│   ├── src/
│   │   ├── App.tsx                 # Router root
│   │   ├── pages/                  # All page components
│   │   ├── components/             # Shared components
│   │   ├── services/               # API clients
│   │   ├── context/                # React contexts (auth, theme)
│   │   ├── hooks/                  # Custom hooks
│   │   └── types/                  # TypeScript types
│   └── Dockerfile
├── suricata-lab/                   # Suricata IDS integration
│   ├── collector/                  # Ubuntu collector service
│   │   ├── app/
│   │   │   ├── main.py             # Collector event loop
│   │   │   ├── parser.py           # EVE JSON parser
│   │   │   ├── sender.py           # HTTP forwarder
│   │   │   ├── config.py           # Env-based config
│   │   │   └── models.py           # SuricataEvent dataclass
│   │   ├── .env.ubuntu             # Ubuntu config template
│   │   ├── fanos-suricata-collector.service  # systemd unit
│   │   ├── setup-ubuntu.sh         # Installation script
│   │   └── requirements.txt
│   ├── config/                     # Suricata config files
│   ├── rules/                      # Custom Suricata rules
│   └── sensor/                     # Windows sensor service (legacy)
├── security-engines/               # Optional security modules
│   ├── waf/                        # ModSecurity + OWASP CRS
│   │   └── config/crs/
│   │       └── fanos-rules.conf    # 17 custom FANOS rules
│   ├── network-ids/
│   ├── network-ips/
│   ├── edr/
│   ├── malware-analysis/
│   └── vulnerability-scanner/
├── docker-compose.yml              # Production compose
├── docs/                           # Documentation
└── .gitignore
```

---

## 5. Backend

### 5.1 Application Entry Point

**File:** `backend/app/main.py`

The FastAPI application is initialized with a `lifespan` context manager that:
1. Configures structured logging (structlog)
2. Runs `init_tables()` to auto-create missing DB tables
3. Initializes WAF seed data via `init_waf_db()`
4. Closes the reverse-proxy engine on shutdown

**Routers mounted:**
- `api_router` at prefix `/api/v1` — all FANOS API routes
- `waf_api_router` at prefix `/waf-api` — WAF management API

**Key endpoints at root level:**

| Method | Path | Description |
|---|---|---|
| GET | `/` | Platform info |
| GET | `/health` or `/api/health` | Detailed health check |
| POST | `/api/scan` | Legacy URL scan (compatibility) |
| GET | `/api/scans` | Legacy scan history |
| GET | `/api/stats` | Legacy threat statistics |

**Health check response includes:**
- Database status
- Suricata collector last-seen timestamp
- ML engine status
- All component statuses

### 5.2 Configuration

**File:** `backend/app/core/config.py`

Configuration is managed by `pydantic-settings`. Every setting can be overridden by an environment variable or `backend/.env`.

| Setting | Default | Description |
|---|---|---|
| `API_PREFIX` | `/api/v1` | All FANOS API routes prefix |
| `SECRET_KEY` | *(dev key)* | JWT signing secret |
| `DATABASE_URL` | `postgresql+asyncpg://...` | Async DB URL |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis for dedup/correlation |
| `SURICATA_INGEST_TOKEN` | `""` | Token for Suricata collector auth |
| `FANOS_SENSOR_TOKEN` | `""` | Token for sensor heartbeat auth |
| `WAF_MODE` | `monitor` | WAF mode: `monitor` or `block` |
| `BLOCK_THRESHOLD` | `70` | Risk score threshold for WAF block |
| `FANOS_DEDUP_WINDOW_SECONDS` | `60` | Suricata event dedup window |
| `FANOS_SURICATA_CORRELATION_WINDOW_SECONDS` | `300` | Correlation time window |
| `FANOS_SURICATA_CORRELATION_MAX_EVENTS` | `100` | Max events per correlation group |

### 5.3 Database Models

**File:** `backend/app/models/security.py`  
**ORM:** SQLAlchemy 2.0 async, PostgreSQL (UUID primary keys)

| Model | Table | Description |
|---|---|---|
| `SecurityEvent` | `security_events` | All ingested security events (WAF, Suricata, etc.) |
| `Incident` | `incidents` | Grouped incidents with status tracking |
| `ResponseAction` | `response_actions` | Automated/manual response actions |
| `BlockedIP` | `blocked_ips` | IP block list |
| `User` | `users` | Platform users (analyst, admin, customer) |
| `Organization` | `organizations` | Tenant organizations |
| `Asset` | `assets` | Monitored assets per organization |
| `ServiceRequest` | `service_requests` | Customer service requests |
| `SensorLifecycle` | `sensor_lifecycles` | Sensor state machine |
| `SensorCommand` | `sensor_commands` | Pending/processed commands to sensors |
| `SensorAuditLog` | `sensor_audit_logs` | Audit trail for sensor admin actions |

**SecurityEvent key columns:**

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `severity` | String | `CRITICAL\|HIGH\|MEDIUM\|LOW` |
| `attack_type` | String | E.g. "Network Exploit" |
| `source_ip` | String | Attacker IP |
| `target` | String | Target IP:port |
| `ai_confidence` | Float | 0–100 |
| `risk_score` | Integer | 0–100 composite score |
| `status` | String | `ALERT\|BLOCKED` |
| `sensor_source` | String | `suricata\|waf\|zeek` |
| `raw_payload` | Text | JSON of original event |
| `request_id` | String | WAF request correlation ID |
| `method` | String | HTTP method (WAF events) |
| `path` | String | HTTP path (WAF events) |
| `decision` | String | WAF decision: `allow\|block` |
| `findings_json` | Text | JSON array of WAF findings |

### 5.4 API Routes

All routes are under `/api/v1/` unless noted.

#### Authentication — `auth.py`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | None | Register new user |
| POST | `/auth/login` | None | Login, returns JWT |
| GET | `/auth/me` | JWT | Current user profile |
| PUT | `/auth/me` | JWT | Update profile |

**JWT:** HS256, configurable expiry (default 60 min). Returned as `{ "access_token": "...", "token_type": "bearer" }`.

**Demo accounts (development):**

| Username | Password | Role |
|---|---|---|
| `admin` | `FanosAdmin2026!` | admin |
| `mulugeta.ababi` | `FanosAdmin2026!` | admin |
| `analyst` | `analyst123` | analyst |

#### Dashboard — `dashboard.py`

| Method | Path | Description |
|---|---|---|
| GET | `/dashboard/stats` | Aggregate security statistics |
| GET | `/dashboard/threats` | Recent threat feed |
| GET | `/dashboard/timeline` | Events timeline |

#### Security Events — `events.py`

| Method | Path | Description |
|---|---|---|
| GET | `/events` | List security events (paginated) |
| GET | `/events/{id}` | Single event detail |
| POST | `/events` | Manual event ingestion |

#### Suricata Events — `suricata_events.py`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/suricata/events` | `X-FANOS-Suricata-Token` header | Ingest Suricata alert |
| GET | `/suricata/events` | JWT | Query Suricata events |
| GET | `/suricata/stats` | JWT | Suricata statistics |

**Ingestion pipeline:**
1. Token validation (`SURICATA_INGEST_TOKEN`)
2. Fingerprint-based deduplication (Redis, 60 s window)
3. Correlation grouping (Redis, 300 s window)
4. AI risk scoring (rule engine + risk engine)
5. Persistence to `security_events`

#### WAF Events — `waf_events.py`

| Method | Path | Description |
|---|---|---|
| POST | `/waf/events` | Ingest WAF telemetry |
| GET | `/waf/events` | Query WAF events |
| GET | `/waf/stats` | WAF statistics |
| GET | `/waf/config` | WAF configuration |

#### Sensors — `sensors.py`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/sensors` | JWT admin | List all sensors |
| GET | `/sensors/{id}/status` | JWT | Sensor lifecycle status |
| POST | `/sensors/{id}/start` | JWT admin | Set desired state to RUNNING |
| POST | `/sensors/{id}/stop` | JWT admin | Set desired state to STOPPED |
| POST | `/sensors/{id}/restart` | JWT admin | Restart sensor |
| POST | `/sensors/{id}/heartbeat` | `X-Sensor-Token` | Sensor heartbeat |
| GET | `/sensors/{id}/commands` | `X-Sensor-Token` | Poll pending commands |

#### Assets — `assets.py`

| Method | Path | Description |
|---|---|---|
| GET | `/assets` | List assets (scoped to org) |
| POST | `/assets` | Create asset |
| PUT | `/assets/{id}` | Update asset |
| DELETE | `/assets/{id}` | Remove asset |

#### Incidents — `incidents.py`

| Method | Path | Description |
|---|---|---|
| GET | `/incidents` | List incidents |
| POST | `/incidents` | Create incident |
| PUT | `/incidents/{id}` | Update incident |
| GET | `/incidents/{id}/events` | Events attached to incident |

#### AI Routes — `ai_routes.py`

| Method | Path | Description |
|---|---|---|
| GET | `/ai/status` | AI engine status + model metrics |
| POST | `/ai/predict` | Raw feature vector prediction |
| POST | `/ai/predict/full` | Full prediction with explanation |
| POST | `/ai/predict/event` | Predict from raw event dict |

#### Threat Detection — `threat_detection.py`

| Method | Path | Description |
|---|---|---|
| POST | `/threat/analyze` | Analyze URL (ML + VirusTotal) |
| GET | `/threat/scans` | Recent URL scans |
| GET | `/threat/scans/{id}` | Scan details |
| GET | `/threat/stats` | Threat statistics |

#### Scanner — `scanner.py`

| Method | Path | Description |
|---|---|---|
| POST | `/scanner/scan` | Start vulnerability scan |
| GET | `/scanner/scans` | Scan history |
| GET | `/scanner/scans/{id}` | Scan report |

#### Prevention — `prevention.py`

| Method | Path | Description |
|---|---|---|
| GET | `/prevention/blocked-ips` | Blocked IP list |
| POST | `/prevention/block` | Block an IP |
| DELETE | `/prevention/block/{ip}` | Unblock an IP |

### 5.5 AI / ML Engine

**Location:** `backend/app/ai/`

The AI subsystem is a singleton architecture. All components are loaded once at startup and reused.

#### FANOSAIEngine (`engine.py`)

Singleton wrapper that delegates to the XGBoost model. Exposes a backward-compatible `predict(features)` API.

**Verified model metrics:**
- Accuracy: **99.87%**
- Precision: **90.17%**
- Recall: **90.91%**
- F1 Score: **90.27%**

#### FANOSModelLoader (`model_loader.py`)

Loads the XGBoost model from file. Supports:
- Automatic path resolution across multiple possible locations
- Graceful degradation if model file is missing
- Status reporting: `loaded | unavailable | error`

**Model file:** `fanos_v3_xgboost_rare_improved.json`  
**Features:** 16-dimensional flow feature vector  
**Classes:** 15 attack categories

#### FANOSPredictor (`predictor.py`)

Runs inference. Accepts either:
- `predict_event(event: dict)` — full event dict, extracts features internally
- `predict_features(features: list)` — pre-built feature vector
- `predict_flow(flow: dict)` — Suricata flow-format event

#### FeatureExtractor (`feature_extractor.py`)

Builds the 16-feature vector from Suricata EVE JSON flow events:
- Flow duration, bytes, packets
- Protocol encoding
- Flags and port classification
- Direction ratios

#### RuleEngine (`rule_engine.py`)

Signature-based detection layer. Evaluates text payloads against a rule catalog. Returns `RuleMatch` with rule name, category, and confidence. Rules cover:
- SQL injection
- XSS
- Directory traversal
- Command injection
- Brute force
- Port scanning

#### RiskEngine (`risk_engine.py`)

Composite risk scorer. Combines:
- AI confidence score
- Rule engine match weight
- Asset criticality (1–10)
- Attack type severity multiplier
- Source IP reputation (known bad IPs)

**Output:** Integer 0–100 risk score → mapped to `CRITICAL | HIGH | MEDIUM | LOW`.

#### CorrelationEngine (`correlation_engine.py`)

Groups events into campaigns by:
- Matching attack type sequences (e.g. Recon → Exploit → Lateral Movement)
- Source IP clustering
- Time window proximity

Returns `CorrelatedCampaign` objects with severity and kill-chain stage.

### 5.6 WAF Engine

**Location:** `backend/app/waf/`

The WAF is a fully embedded Python WAF engine (not a separate process). It operates as a reverse proxy and an inline request inspection pipeline.

#### Pipeline (`engine/pipeline.py`)

Each HTTP request passes through:
1. **Normalizer** — decode URL encoding, normalize headers
2. **Detectors** — parallel detection modules:
   - SQL Injection detector
   - XSS detector
   - Path Traversal detector
   - Command Injection detector
   - Protocol Anomaly detector
   - Rate Limit enforcer
3. **Decision Engine** (`engine/decision.py`) — aggregates findings into a pass/block/monitor decision based on risk threshold
4. **Redactor** (`engine/redactor.py`) — sanitizes sensitive fields from logged request data

#### WAF Modes

| Mode | Behavior |
|---|---|
| `monitor` | Inspect and log, never block |
| `block` | Block requests above `BLOCK_THRESHOLD` risk |

#### ModSecurity Rules (`security-engines/waf/config/crs/fanos-rules.conf`)

17 custom FANOS rules (SIDs 9500001–9500082) covering:
- FANOS-specific API abuse patterns
- Sensor impersonation attempts
- Admin portal brute force
- JWT manipulation
- Suricata collector spoofing

### 5.7 Database Migrations

**Tool:** Alembic  
**Location:** `backend/alembic/versions/`

| Migration | Description |
|---|---|
| `001_initial_schema.py` | Core tables: `security_events`, `incidents`, `response_actions`, `blocked_ips`, `users` |
| `002_organizations_assets.py` | `organizations`, `assets`, `service_requests` tables |
| `003_sensor_lifecycle_state.py` | `sensor_lifecycles` table |
| `004_sensor_command_audit.py` | `sensor_commands`, `sensor_audit_logs` tables |
| `005_seed_demo_sensor.py` | Seeds `demo-sensor-01` sensor record |

**Run migrations:**
```bash
cd backend
alembic upgrade head
```

---

## 6. Frontend

**Stack:** React 18, TypeScript, Vite, Tailwind CSS, Recharts

### 6.1 Pages

| Page / Directory | Route | Description |
|---|---|---|
| `LandingPage.tsx` | `/` | Public marketing landing page |
| `LoginPage.tsx` | `/login` | Authentication |
| `RegisterPage.tsx` | `/register` | User registration |
| `PortalSelectPage.tsx` | `/portals` | Portal selector (SOC / Customer / Admin) |
| `Dashboard.tsx` | `/dashboard` | Main SOC dashboard |
| `soc/` | `/soc/*` | SOC operator views |
| `detection/` | `/detection/*` | Threat detection views |
| `prevention/` | `/prevention/*` | IP blocking / prevention |
| `secops/web/WAFPage.tsx` | `/secops/waf` | WAF monitoring (4 tabs: Overview, Events, Rules, Config) |
| `admin-portal/` | `/admin/*` | Admin portal |
| `admin-portal/SensorControl.tsx` | `/admin/sensors` | Sensor lifecycle management |
| `customer-services/` | `/customer/*` | Customer self-service |
| `scanner/` | `/scanner/*` | Vulnerability scanner UI |
| `ai/` | `/ai/*` | AI engine monitoring |
| `threat-detection/` | `/threats/*` | URL threat detection |
| `infrastructure/` | `/infra/*` | Infrastructure monitoring |

### 6.2 Components

| Directory | Contents |
|---|---|
| `components/layout/` | Sidebar, Navbar, PageShell |
| `components/dashboard/` | Metric cards, charts, event tables |
| `components/secops/` | WAF event table, rule list |
| `components/landing/` | Hero section, feature cards |
| `components/ui/` | Shared UI primitives (buttons, badges, modals) |
| `components/customer/` | Customer portal components |

---

## 7. Suricata IDS Integration

### 7.1 Architecture

Suricata runs on an **Ubuntu VM** (not Windows) because Windows Code Integrity policies block the Suricata executable. The FANOS backend remains on Windows.

```
Ubuntu VM (192.168.56.104)            Windows (192.168.56.1)
┌──────────────────────────┐          ┌──────────────────────────┐
│ Suricata 8.0.7           │          │ FANOS Backend :8000      │
│ Interface: enp0s8        │          │                          │
│ Mode: AF_PACKET IDS      │          │ POST /api/v1/suricata/   │
│ ↓                        │          │      events              │
│ /var/log/suricata/       │          │ ↓                        │
│   eve.json               │          │ Dedup (Redis 60s)        │
│ ↓                        │──HTTP──▶ │ Correlation (Redis 300s) │
│ FANOS Collector          │  POST    │ AI risk scoring          │
│ (Python systemd service) │ +Auth    │ PostgreSQL persistence   │
└──────────────────────────┘          └──────────────────────────┘
```

### 7.2 Collector

**Location:** `suricata-lab/collector/`

The collector is a Python async service that:

1. **Reads** `/var/log/suricata/eve.json` incrementally (byte offset tracking)
2. **Filters** only `event_type == "alert"` entries
3. **Parses** Suricata EVE JSON into a `SuricataEvent` dataclass
4. **Deduplicates** by SHA-256 fingerprint of the raw line
5. **Sends** normalized JSON payload to the FANOS backend via HTTP POST
6. **Retries** indefinitely on backend failure
7. **Persists** file offset + inode + seen-set to `collector-state.json`
8. **Handles** log rotation by detecting inode changes

#### Collector Configuration

| Variable | Description | Ubuntu Value |
|---|---|---|
| `SURICATA_EVE_PATH` | EVE JSON log path | `/var/log/suricata/eve.json` |
| `FANOS_SURICATA_URL` | Backend ingestion endpoint | `http://192.168.56.1:8000/api/v1/suricata/events` |
| `FANOS_SURICATA_TOKEN` | Auth token (must match backend) | *(set in `/etc/fanos/collector.env`)* |
| `SURICATA_SENSOR_ID` | Sensor identifier | `ubuntu-suricata-01` |
| `SURICATA_COLLECTOR_STATE` | State file | `/var/lib/fanos/collector-state.json` |
| `SURICATA_POLL_SECONDS` | Polling interval | `1` |
| `SURICATA_RETRY_SECONDS` | Retry on failure | `5` |

#### Payload Schema (`SuricataEventIngestion`)

```json
{
  "event_id": "<sha256 of raw line>",
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
  "raw_event": { /* original Suricata EVE object */ }
}
```

**Authentication:** `X-FANOS-Suricata-Token: <token>` header (token must match `SURICATA_INGEST_TOKEN` in backend `.env`).

### 7.3 Event Flow

```
Suricata detects packet → writes to eve.json
    → Collector reads new line
    → parse_line() → SuricataEvent dataclass
    → SHA-256 fingerprint check (seen set)
    → HTTP POST to backend with auth token
    → Backend: token validation
    → Backend: Redis dedup (60 s window by network 5-tuple + signature)
    → Backend: Redis correlation (300 s window)
    → Backend: rule_engine.evaluate()
    → Backend: risk_engine.compute()
    → Backend: INSERT INTO security_events
    → Dashboard: event visible in SOC UI
```

---

## 8. WAF (Web Application Firewall)

The WAF has two deployment modes:

### Embedded WAF Engine

The Python WAF engine (`backend/app/waf/`) runs inline within the FastAPI backend. It inspects API requests before they reach business logic.

### ModSecurity + OWASP CRS (Security Engine Layer)

**Location:** `security-engines/waf/`

Provides an external WAF layer with:
- **OWASP Core Rule Set (CRS)** — industry-standard rules
- **17 custom FANOS rules** (SIDs 9500001–9500082)

Custom rule categories:
| SID Range | Category |
|---|---|
| 9500001–9500010 | API abuse and rate limiting |
| 9500011–9500020 | Sensor authentication attacks |
| 9500021–9500030 | Admin portal protection |
| 9500031–9500050 | JWT and authentication anomalies |
| 9500051–9500082 | Protocol and payload anomalies |

### WAF Dashboard (`/secops/waf`)

4-tab interface:
1. **Overview** — attack distribution, blocked vs allowed, top source IPs
2. **Events** — paginated WAF event log with filter
3. **Rules** — rule list with enable/disable
4. **Configuration** — mode toggle (monitor/block), thresholds

---

## 9. Authentication & Authorization

### JWT Authentication

- Token type: Bearer (HS256)
- Issued at: `POST /api/v1/auth/login`
- Validated by: `get_current_principal()` dependency in protected routes
- Expiry: configurable, default 60 minutes

### Principal Model

```python
@dataclass
class Principal:
    user_id: str
    username: str
    role: str          # "admin" | "analyst" | "customer"
    organization: str  # tenant slug
```

### Roles

| Role | Access |
|---|---|
| `admin` | Full access to all routes, sensor control, user management |
| `analyst` | SOC views, events, incidents, AI predictions |
| `customer` | Own assets and service requests only |

### Sensor Authentication

Sensors use a separate shared-secret mechanism:
- **Header:** `X-Sensor-Token`
- **Config key:** `FANOS_SENSOR_TOKEN` in backend `.env`
- Used for: heartbeat (`POST /sensors/{id}/heartbeat`), command polling

### Suricata Collector Authentication

- **Header:** `X-FANOS-Suricata-Token`
- **Config key:** `SURICATA_INGEST_TOKEN` in backend `.env`
- Must match `FANOS_SURICATA_TOKEN` in Ubuntu collector config

---

## 10. Infrastructure & Deployment

### 10.1 Docker Compose

**File:** `docker-compose.yml`

Four services:

| Service | Image | Port | Notes |
|---|---|---|---|
| `db` | `postgres:16-alpine` | 5432 | PostgreSQL with health check |
| `redis` | `redis:7-alpine` | 6379 | Persistence enabled (appendonly) |
| `backend` | Custom Dockerfile | 8000 | Depends on db + redis healthy |
| `frontend` | Custom Dockerfile | 3000 | Nginx serving React build |

**Start with Docker:**
```bash
docker compose up -d
```

**SURICATA_INGEST_TOKEN** must be set via environment variable before starting:
```bash
export SURICATA_INGEST_TOKEN=<your-token>
docker compose up -d
```

### 10.2 Running Locally (Development)

**Prerequisites:**
- Python 3.9+ (project tested on 3.14)
- Node.js 18+
- PostgreSQL 16 running on localhost:5432
- Redis running on localhost:6379

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python run.py
# Starts uvicorn on 0.0.0.0:8000 with hot-reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Starts Vite dev server on localhost:5173
```

**Run database migrations:**
```bash
cd backend
alembic upgrade head
```

---

## 11. Environment Variables

**File:** `backend/.env`

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Async PostgreSQL URL (`postgresql+asyncpg://...`) |
| `DATABASE_SYNC_URL` | Yes | Sync PostgreSQL URL (`postgresql://...`) |
| `REDIS_URL` | Yes | Redis URL (`redis://localhost:6379/0`) |
| `SECRET_KEY` | Yes | JWT signing key (min 32 random bytes in prod) |
| `SURICATA_INGEST_TOKEN` | Yes | Shared secret for Suricata collector |
| `FANOS_SENSOR_TOKEN` | Yes | Shared secret for sensor heartbeat |
| `DEBUG` | No | `True` in dev, `False` in prod |
| `AI_MODEL_PATH` | No | Path to XGBoost model file |
| `VT_API_KEY` | No | VirusTotal API key for URL scanning |
| `FANOS_DEDUP_WINDOW_SECONDS` | No | Event dedup window (default: 60) |
| `FANOS_SURICATA_CORRELATION_WINDOW_SECONDS` | No | Correlation window (default: 300) |
| `FANOS_SURICATA_CORRELATION_MAX_EVENTS` | No | Max correlation group size (default: 100) |
| `WAF_MODE` | No | `monitor` or `block` (default: monitor) |
| `BLOCK_THRESHOLD` | No | WAF block threshold 0–100 (default: 70) |

**Important:** Never commit `.env` to Git. It is covered by `.gitignore` via the `*.env` and `.env.*` patterns.

---

## 12. API Reference

**Interactive Docs:** `http://localhost:8000/api/docs` (Swagger UI)  
**ReDoc:** `http://localhost:8000/api/redoc`  
**OpenAPI JSON:** `http://localhost:8000/api/openapi.json`

### Base URL

```
http://localhost:8000/api/v1/
```

### Authentication Header

```
Authorization: Bearer <jwt_token>
```

### Common Response Codes

| Code | Meaning |
|---|---|
| 200 | Success |
| 202 | Accepted (async ingestion) |
| 400 | Bad request / validation error |
| 401 | Missing or invalid authentication |
| 403 | Insufficient role/permission |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |
| 422 | Unprocessable entity (Pydantic validation) |
| 500 | Internal server error |

---

## 13. Data Flow: End-to-End

### Suricata Alert → SOC Dashboard

```
1. Network packet triggers Suricata rule
2. Suricata writes alert to /var/log/suricata/eve.json
3. Collector (Ubuntu) reads new line (offset tracking)
4. Collector parses EVE JSON → SuricataEvent dataclass
5. Collector computes SHA-256 fingerprint (dedup key)
6. Collector POST /api/v1/suricata/events
   Header: X-FANOS-Suricata-Token: <token>
   Body: normalized JSON payload
7. Backend validates token
8. Backend checks Redis dedup key (60 s window) → skip if duplicate
9. Backend performs correlation in Redis (300 s window)
10. Backend runs rule_engine.evaluate(signature + category)
11. Backend computes risk score via risk_engine.compute()
12. Backend INSERTs SecurityEvent into PostgreSQL
13. Frontend polls /api/v1/suricata/events
14. SOC analyst sees alert in dashboard
```

### WAF Request → Security Event

```
1. HTTP request arrives at FANOS backend
2. WAF pipeline: normalize → detect → decide
3. If risk score ≥ BLOCK_THRESHOLD and WAF_MODE=block → reject
4. WAF telemetry POSTed to /api/v1/waf/events
5. WAF event persisted as SecurityEvent (sensor_source=waf)
6. Visible in WAF dashboard under /secops/waf
```

### URL Threat Analysis

```
1. POST /api/v1/threat/analyze { "url": "..." }
2. URL feature extraction (ML features)
3. scikit-learn classifier → ML prediction
4. VirusTotal API lookup (if VT_API_KEY configured)
5. Combined verdict: MALICIOUS | SUSPICIOUS | SAFE
6. Result stored and returned
```

---

## 14. Security Design

### Principles

1. **Token isolation** — Suricata collector, sensor heartbeat, and user JWT use separate secrets with separate validation paths
2. **No secrets in source code** — all secrets via environment variables only
3. **No secrets in Git** — `.gitignore` covers all `.env*` and `*.env` files
4. **Fail-open for availability** — Redis dedup/correlation failures are non-fatal; events still persist
5. **Role-based access** — admin, analyst, customer roles enforced per route
6. **Structured logging** — structlog with no credential interpolation

### Known Sensitive Files

| File | Sensitivity | Protection |
|---|---|---|
| `backend/.env` | HIGH — all secrets | `.gitignore` |
| `suricata-lab/collector/.env.ubuntu` | Config template only (no real secrets) | `.gitignore` |
| `/etc/fanos/collector.env` (Ubuntu) | HIGH — collector token | `chmod 600`, not in repo |

### Token Reference (Key Names Only, No Values)

| Token Key | Location | Used By |
|---|---|---|
| `SURICATA_INGEST_TOKEN` | `backend/.env` | Validates Suricata collector POST |
| `FANOS_SURICATA_TOKEN` | Ubuntu `/etc/fanos/collector.env` | Sent by Suricata collector |
| `FANOS_SENSOR_TOKEN` | `backend/.env` | Validates sensor heartbeat/commands |
| `SECRET_KEY` | `backend/.env` | JWT signing |

---

## 15. Known Issues & Status

### Current Status (as of documentation date)

| Component | Status | Notes |
|---|---|---|
| Backend API | ✅ Running | `python run.py` on port 8000 |
| PostgreSQL | ✅ Running | localhost:5432 |
| Redis | ✅ Running | localhost:6379 |
| Frontend | ✅ Running | Vite dev on port 5173 or 3000 |
| Suricata (Ubuntu VM) | ✅ Running | 8.0.7, AF_PACKET on enp0s8 |
| Ubuntu Collector | ⏳ Pending | Setup not yet run on Ubuntu VM |
| WAF Engine | ✅ Implemented | Embedded in backend |
| AI Engine | ✅ Loaded | XGBoost V3 model active |

### Pending Actions Before Full Deployment

1. **Windows Firewall** — TCP port 8000 must be opened for inbound connections from `192.168.56.104`:
   ```powershell
   # Run as Administrator
   New-NetFirewallRule -DisplayName "FANOS Backend" `
     -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow
   ```

2. **Ubuntu Collector Deployment** — Deploy and start the collector on the Ubuntu VM:
   ```bash
   sudo bash setup-ubuntu.sh
   sudo nano /etc/fanos/collector.env   # set FANOS_SURICATA_TOKEN
   sudo systemctl start fanos-suricata-collector
   ```

3. **Production Secrets** — Replace all development/placeholder values in `.env`:
   - `SECRET_KEY` — generate: `python -c "import secrets; print(secrets.token_hex(32))"`
   - `SURICATA_INGEST_TOKEN` — already rotated
   - `FANOS_SENSOR_TOKEN` — replace for production

4. **Database Migrations** — Ensure all migrations are applied:
   ```bash
   cd backend && alembic upgrade head
   ```

5. **Sensor Authentication Fix** — `FANOSSensorService` on Windows requires the correct token in `C:\ProgramData\FANOS\config\sensor-service.env` (run `apply-sensor-token-fix.ps1` as Administrator).

---

*Documentation generated from source code inspection.*  
*Repository: https://github.com/mulugeta24/-FANOS-AI*
