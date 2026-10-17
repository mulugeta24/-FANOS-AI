# FANOS AI — Unified AI-Powered Cybersecurity Platform

FANOS AI is a unified, production-oriented cybersecurity operations and threat intelligence platform designed for monitoring, detecting, assessing, and responding to threats across web, network, system, and URL threat surfaces. The platform natively integrates real-time ML-powered malicious URL classification, VirusTotal threat intelligence enrichment, dynamic web vulnerability scanning, network intrusion detection (Suricata/Zeek), Web Application Firewall (WAF) reverse-proxy enforcement, customer security protection, and SOC operations.

> Canonical Repository: [https://github.com/mulugeta24/-FANOS-AI](https://github.com/mulugeta24/-FANOS-AI)
> Author: Mulugeta Ababi
> Primary Browser Entry Point: [http://localhost:3000](http://localhost:3000)

---

## Unified Architecture Overview

```text
FANOS AI PLATFORM (Single Origin: http://localhost:3000)
├── Frontend (React + TypeScript + Vite)
│   ├── Unified Dashboard, SecOps Portal & Customer Protection
│   ├── ML URL Threat Detection (/threat-detection)
│   ├── Web Security Assessment (/web/assessment)
│   └── Reverse Proxy: /api/* -> Backend (http://localhost:8000)
├── Backend / FANOS Core (FastAPI + SQLAlchemy + AsyncPG)
│   ├── Authentication & Role-Based Access Control (JWT)
│   ├── ML Threat Detection Engine (17-Feature XGBoost Classifier)
│   ├── VirusTotal Threat Intelligence Integration (24h Cache)
│   ├── Dynamic Web Security Vulnerability Scanner
│   ├── Incident Management, Risk Engine & Correlation
│   └── Sensor Bridge (Suricata, Zeek NSM, Network Flow IDS)
├── Security Engines & Reverse Proxies
│   ├── FANOS WAF Management API (Port 8001)
│   ├── FANOS WAF Inline Traffic Proxy (Port 8002)
│   └── Suricata / Zeek Sensors & Normalizers
├── Integrations
│   ├── Telegram Threat Intelligence Bot (integrations/telegram_bot/)
│   └── External Threat Feeds & VirusTotal v3 API
├── Database Layer (PostgreSQL 15+ & Redis 7+)
│   ├── Users, Roles & Authentication
│   ├── Incidents, Events & Prevention Actions
│   └── Scans (scans), VT Cache (vt_cache), Reports (user_reports), Stats (stats)
└── ML Models
    ├── URL Classifier (models/url_classifier/ml_model.pkl & label_encoder.pkl)
    └── Network Threat Model (models/fanos_v3_xgboost_rare_improved.json)
```

---

## Unified Features & Services

### 1. ML URL Threat Detection & VirusTotal Intelligence
- **Multi-Class URL Classifier:** Classifies arbitrary URLs into **Benign**, **Defacement**, **Malicious**, or **Phishing**.
- **17 Lexical & Structural Features:** Exact feature extraction schema matching original training pipeline:
  1. `url_length`, 2. `domain_length`, 3. `path_length`, 4. `query_length`, 5. `count_dots`,
  6. `count_hyphens`, 7. `count_underscores`, 8. `count_slashes`, 9. `count_digits`, 10. `count_letters`,
  11. `has_ip`, 12. `is_https`, 13. `count_subdomains`, 14. `has_at_symbol`, 15. `has_query`,
  16. `entropy`, 17. `has_suspicious_tld`.
- **VirusTotal v3 Enrichment:** Server-side asynchronous threat lookup with 24-hour cache in PostgreSQL (`vt_cache`).
- **Hybrid Decision Engine:** Two-tiered consensus where authoritative VT malicious detections elevate verdicts, and fallback ML confidence scoring evaluates probability distributions.
- **Analyst Feedback / Dispute Reporting:** Users and security analysts can dispute classifications; records are logged in `user_reports` for model retraining and audit.

### 2. Web Vulnerability Scanner
- Native vulnerability assessment scanner ported into `backend/app/services/scanner/`.
- Strict Server-Side Request Forgery (SSRF) validation restricting scans of internal loopback, private IP ranges (RFC 1918), and link-local addresses.
- Multi-threaded vulnerability testing for SQLi, XSS, open redirects, missing security headers, and outdated technologies.

### 3. Telegram Threat Intelligence Bot
- Located in [integrations/telegram_bot/telegram_bot.py](integrations/telegram_bot/telegram_bot.py).
- Allows remote analysts and mobile users to submit URLs in Telegram and receive immediate 17-feature breakdown and VirusTotal verdicts.

### 4. Enterprise SecOps, WAF & Network IDS
- Native Suricata EVE.json and Zeek NSM batch parsers.
- Network Flow IDS and WAF inline traffic interception on Port 8002.

## Repository structure

```text
FANOS-AI/
├── .env.example
├── .gitignore
├── AUTHENTICATION_GUIDE.md
├── DATABASE_STRUCTURE.md
├── LICENSE
├── POSTGRESQL_SETUP_GUIDE.md
├── QUICK_START_AUTH.md
├── README.md
├── docker-compose.yml
├── start-dev.ps1
├── backend/
│   ├── .env.example
│   ├── Dockerfile
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── run.py
│   ├── alembic/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── ai/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   └── schemas/
│   └── models/
├── frontend/
│   ├── Dockerfile
│   ├── index.html
│   ├── nginx.conf
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── public/
│   └── src/
├── docs/
├── security-engines/
├── integrations/
├── ml/
├── database/
├── infrastructure/
├── tests/
├── scripts/
├── configs/
├── LICENSE
└── .env.example
```

## Detection → Response architecture

```text
Data Sources
    ↓
FANOS Ingestion
    ↓
Normalization
    ↓
Detection
    ↓
Risk Engine
    ↓
Threat Correlation
    ↓
Incident
    ↓
Response / Prevention
    ↓
Customer SOC
```

This reflects the current documented runtime sequence: data collection, normalization, detection, risk scoring, correlation, incident handling, response, and customer SOC visibility.

## AI / ML

### Current runtime AI location
The active AI implementation is in [backend/app/ai](backend/app/ai), and the current model file is:

- [backend/app/models/fanos_v3_xgboost_rare_improved (1).json](backend/app/models/fanos_v3_xgboost_rare_improved%20(1).json)

### Future ML lifecycle
The [ml](ml) directory is reserved for the future machine-learning lifecycle and contains the expected modular structure for experimentation and training work:

```text
ml/
├── datasets/
├── notebooks/
├── training/
├── models/
└── experiments/
```

The working runtime model remains in [backend/app/models](backend/app/models). It should not be treated as a migrated [ml/models](ml/models) artifact unless a formal migration occurs.

## Quick start

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis 7+

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server is configured in [frontend/vite.config.ts](frontend/vite.config.ts) to run on port 3000 and proxy API requests to http://localhost:8000.

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

The backend listens on http://localhost:8000 by default.

### Docker

```bash
docker compose up --build
```

## API documentation

The FastAPI app exposes documentation at the following URLs when the backend is running:
- http://localhost:8000/api/docs
- http://localhost:8000/api/redoc
- http://localhost:8000/health

### Defined routes

The actual API routes defined in the backend are:

| Method | Path | Source |
|--------|------|--------|
| POST | /api/v1/auth/register | [backend/app/api/v1/auth.py](backend/app/api/v1/auth.py) |
| POST | /api/v1/auth/login | [backend/app/api/v1/auth.py](backend/app/api/v1/auth.py) |
| GET | /api/v1/auth/me | [backend/app/api/v1/auth.py](backend/app/api/v1/auth.py) |
| GET | /api/v1/dashboard/kpis | [backend/app/api/v1/dashboard.py](backend/app/api/v1/dashboard.py) |
| GET | /api/v1/dashboard/threat-activity | [backend/app/api/v1/dashboard.py](backend/app/api/v1/dashboard.py) |
| GET | /api/v1/dashboard/attack-distribution | [backend/app/api/v1/dashboard.py](backend/app/api/v1/dashboard.py) |
| GET | /api/v1/dashboard/risk-distribution | [backend/app/api/v1/dashboard.py](backend/app/api/v1/dashboard.py) |
| GET | /api/v1/events/live | [backend/app/api/v1/events.py](backend/app/api/v1/events.py) |
| GET | /api/v1/events/{event_id} | [backend/app/api/v1/events.py](backend/app/api/v1/events.py) |
| GET | /api/v1/incidents/active | [backend/app/api/v1/incidents.py](backend/app/api/v1/incidents.py) |
| GET | /api/v1/incidents/ | [backend/app/api/v1/incidents.py](backend/app/api/v1/incidents.py) |
| GET | /api/v1/incidents/{incident_id} | [backend/app/api/v1/incidents.py](backend/app/api/v1/incidents.py) |
| GET | /api/v1/ai/engine/status | [backend/app/api/v1/ai_routes.py](backend/app/api/v1/ai_routes.py) |
| POST | /api/v1/ai/predict | [backend/app/api/v1/ai_routes.py](backend/app/api/v1/ai_routes.py) |
| POST | /api/v1/ai/rule-check | [backend/app/api/v1/ai_routes.py](backend/app/api/v1/ai_routes.py) |
| GET | /api/v1/prevention/status | [backend/app/api/v1/prevention.py](backend/app/api/v1/prevention.py) |
| GET | /api/v1/prevention/blocked-ips | [backend/app/api/v1/prevention.py](backend/app/api/v1/prevention.py) |
| POST | /api/v1/prevention/blocked-ips | [backend/app/api/v1/prevention.py](backend/app/api/v1/prevention.py) |
| DELETE | /api/v1/prevention/blocked-ips/{ip_address} | [backend/app/api/v1/prevention.py](backend/app/api/v1/prevention.py) |
| GET | /api/v1/prevention/actions | [backend/app/api/v1/prevention.py](backend/app/api/v1/prevention.py) |
| GET | /api/v1/web-security/stats | [backend/app/api/v1/web_security.py](backend/app/api/v1/web_security.py) |
| POST | /api/v1/web-security/assess | [backend/app/api/v1/web_security.py](backend/app/api/v1/web_security.py) |
| GET | /api/v1/infrastructure/sensors | [backend/app/api/v1/infrastructure.py](backend/app/api/v1/infrastructure.py) |
| GET | /api/v1/infrastructure/health | [backend/app/api/v1/infrastructure.py](backend/app/api/v1/infrastructure.py) |
| GET | /api/v1/sms/stats | [backend/app/api/v1/sms.py](backend/app/api/v1/sms.py) |
| GET | /api/v1/sms/customers | [backend/app/api/v1/sms.py](backend/app/api/v1/sms.py) |
| POST | /api/v1/sms/customers | [backend/app/api/v1/sms.py](backend/app/api/v1/sms.py) |
| DELETE | /api/v1/sms/customers/{customer_id} | [backend/app/api/v1/sms.py](backend/app/api/v1/sms.py) |
| POST | /api/v1/sms/send | [backend/app/api/v1/sms.py](backend/app/api/v1/sms.py) |
| GET | /api/v1/sms/messages | [backend/app/api/v1/sms.py](backend/app/api/v1/sms.py) |
| GET | /api/v1/sms/settings | [backend/app/api/v1/sms.py](backend/app/api/v1/sms.py) |
| PUT | /api/v1/sms/settings | [backend/app/api/v1/sms.py](backend/app/api/v1/sms.py) |
| POST | /api/v1/threat-detection/analyze | [backend/app/api/v1/threat_detection.py](backend/app/api/v1/threat_detection.py) |
| GET | /api/v1/threat-detection/scans | [backend/app/api/v1/threat_detection.py](backend/app/api/v1/threat_detection.py) |
| GET | /api/v1/threat-detection/stats | [backend/app/api/v1/threat_detection.py](backend/app/api/v1/threat_detection.py) |
| POST | /api/v1/threat-detection/report | [backend/app/api/v1/threat_detection.py](backend/app/api/v1/threat_detection.py) |
| POST | /api/v1/scanner/validate | [backend/app/api/v1/scanner.py](backend/app/api/v1/scanner.py) |
| POST | /api/v1/scanner/start | [backend/app/api/v1/scanner.py](backend/app/api/v1/scanner.py) |
| POST | /api/scan | [backend/app/main.py](backend/app/main.py) *(Legacy FANOS-CYBERSEC bridge)* |
| GET | /api/scans | [backend/app/main.py](backend/app/main.py) *(Legacy FANOS-CYBERSEC bridge)* |
| POST | /api/report | [backend/app/main.py](backend/app/main.py) *(Legacy FANOS-CYBERSEC bridge)* |
| GET | /api/stats | [backend/app/main.py](backend/app/main.py) *(Legacy FANOS-CYBERSEC bridge)* |
| GET | /api/public/stats | [backend/app/main.py](backend/app/main.py) *(Legacy FANOS-CYBERSEC bridge)* |

## Unified Service & Port Mapping

| Service | Port | Description | Access / URL |
|---------|------|-------------|--------------|
| **Unified Frontend** | `3000` | Primary React + Vite SPA, SOC dashboards, & URL threat detection | [http://localhost:3000](http://localhost:3000) |
| **Backend Core API** | `8000` | FastAPI, ML URL detection engine, VT intelligence & DB | [http://localhost:8000](http://localhost:8000) (Proxied via `:3000/api`) |
| **FANOS WAF Management** | `8001` | Deterministic WAF rule configuration & alerts API | [http://127.0.0.1:8001](http://127.0.0.1:8001) |
| **FANOS WAF Frontend** | `3001` | Dedicated WAF management dashboard | [http://localhost:3001](http://localhost:3001) |
| **WAF Reverse Proxy** | `8002` | Inline traffic proxy inspecting HTTP streams | [http://127.0.0.1:8002](http://127.0.0.1:8002) |
| **PostgreSQL** | `5432` | Relational storage for users, incidents, scans & VT cache | `localhost:5432` |
| **Redis** | `6379` | Fast key-value store for rate limiting and cache | `localhost:6379` |
| **Telegram Threat Bot** | Dynamic | Async polling bot connected to unified ML threat engine | `integrations/telegram_bot/` |

## Automated Verification & Testing

Run full backend test suite:
```bash
& "backend\.venv\Scripts\pytest.exe" tests/backend/ tests/api/
```
All 33 automated tests cover:
- Infrastructure and sensor control bridge (`test_infrastructure.py`, `test_sensor_control_bridge.py`)
- Zeek collectors, normalizers, and batch parsers (`test_collector.py`, `test_normalizer.py`, `test_parser.py`)
- 17-feature extraction and XGBoost URL classifier (`test_url_detector.py`)
- URL threat detection API, validation, VirusTotal fallbacks, dispute submission, and stats (`test_threat_detection_api.py`)

Run frontend production build verification:
```bash
cd frontend
npm run build
```
Builds cleanly with zero TypeScript or packaging errors into `frontend/dist/`.

## Environment templates

The repository includes the following actual environment templates:
- root template: [.env.example](.env.example)
- backend template: [backend/.env.example](backend/.env.example)

These should be copied to local working files such as `.env` or `backend/.env` before running the app locally.

## Security and configuration notes

- Keep local secrets in local environment files and do not commit them.
- [backend/.env.example](backend/.env.example) and [.env.example](.env.example) are the actual templates currently present in the repo.
- The project keeps the current working application in place and marks future platform modules as architectural boundaries rather than claiming production implementations that are not present.

## License

FANOS AI is proprietary software developed for enterprise cybersecurity.
© 2026 Mulugeta Ababi — FANOS AI Platform.
All rights reserved.

## Project summary

FANOS AI combines a React frontend, a FastAPI backend, AI-driven detection, risk scoring, threat correlation, and SOC dashboards in one enterprise cybersecurity platform. The repository reflects the current runtime system while preserving clear future modular boundaries for security engines, integrations, and ML lifecycle expansion.

