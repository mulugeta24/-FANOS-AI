# FANOS AI — API Capability & Integration Matrix (Phase 0)

**Date:** October 2026  
**Auditor:** Senior Frontend Architect & Full-Stack Engineer  
**Backend Framework:** FastAPI (`backend/app/main.py`)  
**Base URL:** `/api/v1`  

---

## 1. Overview of Backend API Surface

The backend exposes 10 registered routers under `api_router` in [`backend/app/api/v1/__init__.py`](file:///d:/fanos%20ai/-FANOS-AI/backend/app/api/v1/__init__.py), plus unmounted routers and daemon ingestion endpoints.

```
FastAPI Application (/api/v1)
├── auth.router            (/auth)           — User registration & login (DB)
├── dashboard.router       (/dashboard)      — KPIs, threat curve, attack/risk donuts
├── events.router          (/events)         — Streaming security events (DB)
├── incidents.router       (/incidents)      — Active incidents (In-memory Python list)
├── ai_routes.router       (/ai)             — 16D_CHAMPION XGBoost inference & status
├── prevention.router      (/prevention)     — Blocked IPs & actions (In-memory list)
├── web_security.router    (/web-security)   — Stats (Mock) & URI assessment (Rule engine)
├── infrastructure.router  (/infrastructure) — Sensors list & health (Mock)
├── sms.router             (/sms)            — SMS alert service (DB & provider)
├── suricata_events.router (/suricata)       — EVE JSON alert & flow ingestion
└── [UNMOUNTED] sensors.py (/sensors)        — Sensor daemon lifecycle control
```

---

## 2. Endpoint-by-Endpoint Capability Matrix

| Endpoint | Method | Required Auth | Backend Data Source | Response Format | Frontend Usage | Reality / Gaps |
|---|---|---|---|---|---|---|
| `/auth/register` | `POST` | Public | PostgreSQL `User` | `{ id, username, email, role }` | [`RegisterPage.tsx:71`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/pages/RegisterPage.tsx#L71) | **Working.** Creates user in DB. Bug: Hardcodes `http://localhost:8000`. |
| `/auth/login` | `POST` | Public | PostgreSQL `User` | `{ access_token, token_type, role }` | **None** | **Unused.** Frontend `LoginPage.tsx` completely ignores this endpoint. |
| `/dashboard/kpis` | `GET` | Public | Hybrid: Real DB `COUNT(*)` + hardcoded floats | `DashboardKPIs` schema | [`useDashboardKPIs()`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/hooks/useDashboard.ts#L43) | **Partially Verified.** `security_events` count is real; accuracy, health, and sensor counts are hardcoded. |
| `/dashboard/threat-activity` | `GET` | Public | Hardcoded Python tuples | `List[ThreatActivityPoint]` | [`useThreatActivity()`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/hooks/useDashboard.ts#L52) | **Simulated.** Returns static 24h curve; ignores `hours` param; no DB queries. |
| `/dashboard/attack-distribution`| `GET` | Public | Real DB `GROUP BY attack_type` | `List[AttackDistributionItem]`| [`useAttackDistribution()`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/hooks/useDashboard.ts#L61)| **Verified Working.** Real SQL aggregation over `SecurityEvent`. |
| `/dashboard/risk-distribution` | `GET` | Public | Real DB `GROUP BY severity` | `List[RiskDistributionItem]` | `RiskDistributionPanel.tsx` | **Partially Verified.** SQL query is real, but defaults to fake numbers if count is 0. |
| `/events/live` | `GET` | Public | PostgreSQL `SecurityEvent` | `List[SecurityEventOut]` | [`useLiveEvents()`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/hooks/useDashboard.ts#L70) | **Verified Working.** Streams live Suricata alerts and ML predictions from DB. |
| `/events/{id}` | `GET` | Public | PostgreSQL `SecurityEvent` | `SecurityEventOut` | None | **Available.** Ready for dynamic event detail drawer. |
| `/incidents/active` | `GET` | Public | In-memory Python `INCIDENTS` | `List[IncidentOut]` | [`useActiveIncidents()`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/hooks/useDashboard.ts#L79) | **Mocked.** Data not stored in PostgreSQL; lost on backend restart. |
| `/incidents/` | `GET` | Public | In-memory Python `INCIDENTS` | `List[IncidentOut]` | `Incidents.tsx` | **Mocked.** Paginated in-memory list. |
| `/incidents/{id}` | `GET` | Public | In-memory Python `INCIDENTS` | `IncidentOut` | None | **Available.** In-memory lookup. |
| `/ai/engine/status` | `GET` | Public | `ai_engine.get_status()` | `{ model_name, accuracy, num_features, ... }` | [`useAIEngineStatus()`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/hooks/useDashboard.ts#L88) | **Working.** Returns real 70 features & 15 classes, but UI ignores these fields. |
| `/ai/predict` | `POST` | Public | XGBoost `16D_CHAMPION` inference | `PredictionResponse` | None (Backend internal) | **Verified Working.** Evaluates 70-feature flow vector with multi-class probabilities. |
| `/prevention/status` | `GET` | Public | Hardcoded static numbers | `PreventionStatus` schema | [`usePreventionStatus()`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/hooks/useDashboard.ts#L118)| **Mocked.** Returns static `blocked_sessions=23`, `waf_blocks=47`. |
| `/prevention/blocked-ips` | `GET` | Public | In-memory Python `_blocked_ips` | `List[BlockedIPOut]` | None | **Mocked.** In-memory list; not connected to `BlockedIPs.tsx`. |
| `/prevention/block-ip` | `POST` | Public | In-memory Python `_blocked_ips` | `BlockedIPOut` | None | **Mocked.** Appends to in-memory list; no firewall integration. |
| `/prevention/unblock-ip` | `DELETE`| Public | In-memory Python `_blocked_ips` | `{ success: true }` | None | **Mocked.** Removes from in-memory list. |
| `/web-security/stats` | `GET` | Public | Hardcoded static numbers | `WebSecurityStats` | [`useWebSecurityStats()`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/hooks/useDashboard.ts#L127)| **Mocked.** Returns static `total_requests=12842`, `suspicious=342`. |
| `/web-security/assess` | `POST` | Public | Regex `rule_engine.py` | `URIAssessmentResult` | [`useURIAssessment()`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/components/dashboard/URIAssessmentPanel.tsx#L12) | **Verified Working.** Executes real regex rule evaluation on URI string. |
| `/infrastructure/sensors` | `GET` | Public | Hardcoded in `infrastructure.py` | `List[SensorOut]` | [`useSensors()`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/hooks/useDashboard.ts#L97) | **Mocked.** Returns static list claiming 6 sensors online. |
| `/infrastructure/health` | `GET` | Public | Hardcoded dict | `{ status: "healthy", ... }` | None | **Mocked.** Static dictionary. |
| `/suricata/events` | `POST` | Shared Collector Token | Ubuntu VM daemon ingestion | `{ success: true, event_id }` | Ubuntu Collector | **Verified Working.** Ingests real network alerts into PostgreSQL `SecurityEvent`. |
| `/suricata/flows` | `POST` | Shared Collector Token | Ubuntu VM daemon ingestion | `{ success: true, ml_prediction, ... }` | Ubuntu Collector | **Verified Working.** Ingests network flows; runs XGBoost classification; saves to DB. |
| `/suricata/events` | `GET` | `Depends(get_current_principal)` | PostgreSQL `SecurityEvent` | `List[SecurityEventOut]` | None | **Working.** Real query with auth check, but unused by frontend. |
| `/sensors/{id}/status` | `GET` | `Depends(get_current_principal)` | DB `SensorLifecycle` | `SensorStatusResponse` | None (Frontend calls wrong path) | **Broken.** Router not mounted in `api_router`; frontend calls wrong URL. |
| `/sensors/{id}/start` | `POST` | `Depends(require_admin)` | DB `SensorCommand` | `SensorCommandResponse` | [`startSensor()`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/lib/api.ts#L120) | **Broken.** Router unmounted; URL path mismatch; frontend `.catch()` fakes success. |
| `/sms/*` | Multiple | Public | PostgreSQL SMS tables | Multiple schemas | [`SmsDashboard.tsx`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/pages/admin/sms/SmsDashboard.tsx#L11) | **Working.** Real SMS CRUD; hardcoded localhost:8000 URL in client. |

---

## 3. Critical API Gaps for Frontend Redesign

To achieve a production-grade, truthful SOC user experience, the following gaps in the backend API must be addressed:

1. **Authentication Enforcement:**
   - Core endpoints (`/dashboard/*`, `/events/*`, `/incidents/*`) must be protected by `Depends(get_current_principal)`.
2. **Mount the Sensor Router:**
   - Mount `sensors.router` in [`backend/app/api/v1/__init__.py`](file:///d:/fanos%20ai/-FANOS-AI/backend/app/api/v1/__init__.py) and align the URL path with the frontend (`/sensors` vs `/infrastructure/sensors`).
3. **Database-Backed Incidents:**
   - Migrate `/incidents/*` from in-memory Python objects to the PostgreSQL `Incident` model.
4. **Dynamic Threat Activity Time Series:**
   - Replace the static tuple array in `/dashboard/threat-activity` with a real SQL aggregation query:
     ```sql
     SELECT date_trunc('hour', created_at) AS time_bucket, count(*) AS count
     FROM security_events
     WHERE created_at >= NOW() - INTERVAL '24 hours'
     GROUP BY time_bucket
     ORDER BY time_bucket;
     ```
5. **Missing User Management API:**
   - Neither `/admin/users` nor `/admin-portal/users` has a corresponding backend API to list, invite, edit, or delete platform users.
