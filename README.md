# FANOS AI — Enterprise Cybersecurity Intelligence Platform

FANOS AI is a cybersecurity operations platform designed for monitoring, detecting, assessing, and responding to threats across web, network, and system surfaces. The repository contains the current working application and keeps future platform expansion modules as clearly separated architectural boundaries.

> Author: Mulugeta Ababi

## Architecture overview

```text
FANOS AI PLATFORM
├── Frontend
│   └── React + TypeScript + Vite
├── Backend / FANOS Core
│   └── FastAPI + SQLAlchemy + Alembic
├── Security Engines
│   ├── WAF
│   ├── Network IDS
│   ├── Network IPS
│   ├── EDR
│   ├── Vulnerability Scanner
│   └── Malware Analysis
├── Integrations
│   ├── Cloud
│   ├── Firewall
│   ├── Endpoint Security
│   ├── SIEM
│   ├── Identity
│   └── Threat Intelligence
├── AI / ML
│   ├── Current runtime AI engine
│   └── Future ML lifecycle
├── Database
├── Infrastructure
├── Testing
└── Documentation
```

The security-engine and integration directories are architectural/future-boundary folders and are not full production implementations unless explicitly added later.

## Current runtime architecture

### Frontend
- React + TypeScript + Vite app under [frontend](frontend)
- Dashboard, landing, authentication, detection, infrastructure, and prevention pages under [frontend/src](frontend/src)
- Reusable UI components under [frontend/src/components](frontend/src/components)
- App logic in [frontend/src/hooks](frontend/src/hooks), [frontend/src/lib](frontend/src/lib), and [frontend/src/pages](frontend/src/pages)

### Backend / FANOS Core
- FastAPI application under [backend/app](backend/app)
- AI logic under [backend/app/ai](backend/app/ai)
- API routes under [backend/app/api](backend/app/api)
- Models and schemas under [backend/app/models](backend/app/models) and [backend/app/schemas](backend/app/schemas)
- Configuration and security settings under [backend/app/core](backend/app/core)

### Runtime AI and detection flow
- Current AI runtime location: [backend/app/ai](backend/app/ai)
- AI engine entry: [backend/app/ai/engine.py](backend/app/ai/engine.py)
- Rule engine: [backend/app/ai/rule_engine.py](backend/app/ai/rule_engine.py)
- Risk engine: [backend/app/ai/risk_engine.py](backend/app/ai/risk_engine.py)
- Correlation engine: [backend/app/ai/correlation_engine.py](backend/app/ai/correlation_engine.py)
- Current model: [backend/app/models/fanos_v3_xgboost_rare_improved (1).json](backend/app/models/fanos_v3_xgboost_rare_improved%20(1).json)

### Future modular components
The following directories exist as architectural and future expansion boundaries:
- [security-engines](security-engines)
- [integrations](integrations)
- [ml](ml)
- [database](database)
- [infrastructure](infrastructure)
- [tests](tests)
- [scripts](scripts)
- [configs](configs)

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

