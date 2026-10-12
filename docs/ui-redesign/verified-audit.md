# FANOS AI — Verified Audit Report (Phase 0)

**Date:** October 2026  
**Auditor:** Senior Frontend Architect & Cybersecurity SOC UX Specialist  
**Status:** Read-Only Inspection Baseline (Phase 0 Complete)  
**Repository Branch:** `feature/live-telemetry-ui-fix`  
**Base Commit:** `548a464`  

---

## 1. Executive Summary & Verification Overview

This document establishes the verified baseline of the FANOS AI cybersecurity platform prior to any user interface redesign or functional modification. Following the non-negotiable rules of Phase 0, the previous UI audit findings were treated as hypotheses and rigorously checked against the repository's source code, active Docker containers, backend FastAPI routes, and database models.

### Key Verification Metrics
- **Total Frontend Routes:** 76 routes declared in [`frontend/src/App.tsx`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/App.tsx).
- **Verified Functional Routes:** 9 routes (11.8%).
- **Partially Functional Routes:** 4 routes (5.3%).
- **Visual Mockups / Static In-Memory Pages:** 27 routes (35.5%).
- **Dead-End Placeholders (`Placeholder.tsx` / `AdminPlaceholder.tsx`):** 36 routes (47.4%).
- **Active Backend Endpoints Requiring User JWT:** **0% of core dashboard endpoints.** Over 95% of routes are unauthenticated.
- **Backend Error Visibility:** **0% on primary dashboard** due to universal `withFallback()` error swallowing.

---

## 2. Evidence-Based Verification of Material Findings

Each reported finding from the audit checklist was investigated against source files. Findings are categorized as **CONFIRMED**, **PARTIALLY CONFIRMED**, **DISPROVED**, or **UNABLE TO VERIFY**.

---

### Finding 1: Authentication Bypass and Exposed Client Credentials
- **Reported Claim:** `LoginPage.tsx` is 100% mocked on the client side, never calls `/api/v1/auth/login`, stores plaintext passwords in the client bundle, and issues fake tokens. Newly registered users cannot log in.
- **Files & Functions Inspected:**
  - [`frontend/src/pages/LoginPage.tsx`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/pages/LoginPage.tsx): Lines 15–40 (`DEMO_USERS`), Lines 83–104 (`handleSubmit`).
  - [`frontend/src/pages/RegisterPage.tsx`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/pages/RegisterPage.tsx): Line 71 (`handleSubmit`).
  - [`frontend/src/components/layout/RequireAuth.tsx`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/components/layout/RequireAuth.tsx): Lines 9–18 (`RequireAuth`).
  - [`backend/app/api/v1/auth.py`](file:///d:/fanos%20ai/-FANOS-AI/backend/app/api/v1/auth.py): Lines 28–65 (`register`, `login`).
- **Evidence Found:**
  1. `LoginPage.tsx` defines `const DEMO_USERS: Record<string, ...>` containing 4 accounts with plaintext passwords directly in the client bundle.
  2. `handleSubmit` uses `setTimeout` (600ms artificial delay) and checks `user.password !== password` against local memory; it performs no `fetch()` or `axios` call.
  3. On success, line 94 stores `fanos_token = 'demo-token-' + key + '-' + Date.now()`.
  4. `RequireAuth.tsx` checks only `Boolean(localStorage.getItem('fanos_token'))`. Any non-empty string grants full access.
  5. `RegisterPage.tsx` successfully posts to `http://localhost:8000/api/v1/auth/register`, creating a user in PostgreSQL. However, when redirected to `/login`, that user cannot authenticate because `LoginPage.tsx` validates exclusively against `DEMO_USERS`.
- **Status:** **CONFIRMED** (Critical Severity).
- **User Impact:** Extreme security vulnerability (hardcoded credentials in client code) and broken user onboarding.
- **Recommended Correction:** Remove `DEMO_USERS`. Wire `LoginPage` to `POST /api/v1/auth/login`. Have `RequireAuth` validate token structure, role, and expiration.

---

### Finding 2: Universal Silent Error Swallowing
- **Reported Claim:** React Query hooks swallow all network, 401, 404, and 500 errors and silently replace them with mock data, while displaying a green "LIVE · Production Connected" badge.
- **Files & Functions Inspected:**
  - [`frontend/src/hooks/useDashboard.ts`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/hooks/useDashboard.ts): Lines 38–41 (`withFallback`), Lines 43–133 (`useDashboardKPIs`, `useThreatActivity`, `useLiveEvents`, etc.).
  - [`frontend/src/pages/Dashboard.tsx`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/pages/Dashboard.tsx): Lines 33–34, 63–76 (Live badge rendering).
  - [`frontend/src/components/layout/ConnectionBanner.tsx`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/components/layout/ConnectionBanner.tsx): Lines 14–48.
- **Evidence Found:**
  1. `useDashboard.ts` defines:
     ```typescript
     function withFallback<T>(promise: Promise<T>, fallback: T): Promise<T> {
       return promise.catch(() => fallback)
     }
     ```
  2. Every dashboard hook (`useDashboardKPIs`, `useThreatActivity`, `useAttackDistribution`, `useLiveEvents`, `useActiveIncidents`, `useAIEngineStatus`, `useSensors`, `useResponseActions`, `usePreventionStatus`, `useWebSecurityStats`) applies `withFallback`.
  3. `Dashboard.tsx` checks `useBackendStatus()` (which only queries `GET /health`). If `/health` returns `{ status: "healthy" }`, the UI displays `LIVE · Production Connected` even when all telemetry endpoints are failing or returning fallback data.
- **Status:** **CONFIRMED** (High Severity).
- **User Impact:** Analysts are deceived into believing live monitoring is operational when the database or telemetry pipeline is offline.
- **Recommended Correction:** Eliminate `withFallback`. Expose standard React Query `isError`, `isLoading`, and `isSuccess` states. Render explicit error banners and retry actions.

---

### Finding 3: Actual Runtime Machine Learning Metadata vs. UI Claims
- **Reported Claim:** The UI claims the model uses 46 network features and 12 attack categories, but the backend uses 70 features and 15 classes.
- **Files & Functions Inspected:**
  - [`frontend/src/pages/ai/AIEngine.tsx`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/pages/ai/AIEngine.tsx): Lines 53–55.
  - [`frontend/src/lib/mockData.ts`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/lib/mockData.ts): Lines 62–72 (`mockAIEngine`).
  - [`backend/app/ai/model_loader.py`](file:///d:/fanos%20ai/-FANOS-AI/backend/app/ai/model_loader.py): Lines 34–43, 293–305 (`get_status_dict`).
  - [`backend/app/ai/predictor.py`](file:///d:/fanos%20ai/-FANOS-AI/backend/app/ai/predictor.py): Lines 3–14, 49–59 (`MLPrediction`).
  - [`backend/app/ai/feature_extractor.py`](file:///d:/fanos%20ai/-FANOS-AI/backend/app/ai/feature_extractor.py): Lines 24–32, 280–310.
  - Runtime execution of [`backend/test_fanos_v3_champion.py`](file:///d:/fanos%20ai/-FANOS-AI/backend/test_fanos_v3_champion.py) inside Docker `fanos-backend`.
- **Evidence Found:**
  1. In `model_loader.py`, `NUM_CLASSES = 15` (Class IDs 0–14: `BENIGN`, `Bot`, `DDoS`, `DoS GoldenEye`, `DoS Hulk`, `DoS Slowhttptest`, `DoS slowloris`, `FTP-Patator`, `Heartbleed`, `Infiltration`, `PortScan`, `SSH-Patator`, `Web Attack - Brute Force`, `Web Attack - Sql Injection`, `Web Attack - XSS`).
  2. In `model_loader.py` and booster artifact, `NUM_FEATURES = 70`. Booster verification test passes: `Actual booster num_features: 70`.
  3. Feature extractor also supports native Suricata flow schema `SURICATA_FLOW_NATIVE_V1` with 25 features.
  4. `AIEngine.tsx` hardcodes:
     - `Classes: '12 attack categories'`
     - `Features: '46 network flow features'`
     - `Training Data: 'NSL-KDD + CICIDS-2017 + custom'`
- **Status:** **CONFIRMED** (Medium Severity - Data Truthfulness).
- **User Impact:** The UI displays outdated model specifications that contradict the actual runtime model.
- **Recommended Correction:** Bind `AIEngine.tsx` metrics directly to `useAIEngineStatus()`, displaying real `num_features` (70 / 25) and `num_classes` (15).

---

### Finding 4: Suricata Ingestion Reality vs. Frontend Disconnect
- **Reported Claim:** Suricata collector is actively ingesting real events, but the dedicated Suricata page shows static mock data.
- **Files & Functions Inspected:**
  - [`backend/app/api/v1/suricata_events.py`](file:///d:/fanos%20ai/-FANOS-AI/backend/app/api/v1/suricata_events.py): Lines 313–384 (`ingest_suricata_event`), Lines 461–525 (`ingest_suricata_flow`).
  - [`frontend/src/pages/secops/network/SuricataPage.tsx`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/pages/secops/network/SuricataPage.tsx): Lines 12–28.
  - Collector journal logs from Ubuntu VM.
- **Evidence Found:**
  1. `POST /api/v1/suricata/events` and `POST /api/v1/suricata/flows` are actively receiving real network alert payloads from Ubuntu collector daemon and committing them to PostgreSQL `SecurityEvent`.
  2. `GET /api/v1/events/live` queries these records and serves them to `LiveEventsPanelEnhanced.tsx`.
  3. However, `SuricataPage.tsx` defines `const SURICATA_ALERTS = [...]` and `const SIGNATURES = [...]` in local memory and makes **zero API requests**.
- **Status:** **CONFIRMED** (High Severity).
- **User Impact:** Operators navigating to the dedicated Suricata Network IDS page see simulated events rather than the live Suricata stream.
- **Recommended Correction:** Connect `SuricataPage.tsx` to `GET /api/v1/events/live?sensor_source=suricata`.

---

### Finding 5: Broken Sensor Lifecycle Control Bridge
- **Reported Claim:** Sensor start/stop/restart commands fail with 404, but `.catch()` swallows the failure and falsely reports `ONLINE`.
- **Files & Functions Inspected:**
  - [`frontend/src/lib/api.ts`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/lib/api.ts): Lines 108–127 (`startSensor`, `stopSensor`, `restartSensor`).
  - [`backend/app/api/v1/sensors.py`](file:///d:/fanos%20ai/-FANOS-AI/backend/app/api/v1/sensors.py): Lines 24, 116–135.
  - [`backend/app/api/v1/__init__.py`](file:///d:/fanos%20ai/-FANOS-AI/backend/app/api/v1/__init__.py): Lines 15–26.
- **Evidence Found:**
  1. `frontend/src/lib/api.ts` makes requests to `/infrastructure/sensors/${sensorId}/start`.
  2. `backend/app/api/v1/sensors.py` is configured with `prefix="/sensors"`, meaning its routes are at `/sensors/...`.
  3. Furthermore, `sensors.py` is **not included** in `api_router` in `backend/app/api/v1/__init__.py`.
  4. Any call to `/infrastructure/sensors/.../start` results in an HTTP 404 from FastAPI.
  5. `api.ts` handles this with:
     ```typescript
     export const startSensor = (sensorId: string) =>
       client.post(`/infrastructure/sensors/${sensorId}/start`).then((r) => r.data).catch(() => ({ status: 'ONLINE' }))
     ```
- **Status:** **CONFIRMED** (High Severity - False Action Success).
- **User Impact:** Actions falsely appear successful even though the backend never received or processed the command.
- **Recommended Correction:** Register `sensors.router` in `api_router`, correct URL paths, and remove `.catch(() => ({ status: 'ONLINE' }))`.

---

### Finding 6: Hardcoded Backend URLs in Client Code
- **Reported Claim:** Frontend components bypass Vite proxies and hardcode `http://localhost:8000`.
- **Files & Functions Inspected:**
  - [`frontend/src/pages/RegisterPage.tsx`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/pages/RegisterPage.tsx): Line 71.
  - [`frontend/src/pages/admin/sms/SmsDashboard.tsx`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/pages/admin/sms/SmsDashboard.tsx): Line 11.
- **Evidence Found:**
  1. `RegisterPage.tsx`: `fetch('http://localhost:8000/api/v1/auth/register', ...)`
  2. `SmsDashboard.tsx`: `const API = 'http://localhost:8000/api/v1/sms'`
- **Status:** **CONFIRMED** (Medium Severity).
- **User Impact:** Fails immediately in any non-localhost environment (Docker, domain name, remote client).
- **Recommended Correction:** Use relative paths (`/api/v1/...`) configured through Vite environment variables (`VITE_API_URL`).

---

### Finding 7: Backend Telemetry Fabrication (Time Series & KPIs)
- **Reported Claim:** The Threat Activity time-series curve and portions of the KPI cards are hardcoded in the backend Python code.
- **Files & Functions Inspected:**
  - [`backend/app/api/v1/dashboard.py`](file:///d:/fanos%20ai/-FANOS-AI/backend/app/api/v1/dashboard.py): Lines 34–99 (`get_kpis`, `get_threat_activity`).
- **Evidence Found:**
  1. `get_threat_activity` contains a static Python tuple array:
     ```python
     data = [("00:00", 12, 8, 3, 18), ("02:00", 18, 12, 5, 28), ...]
     ```
     Zero database queries are made; the `hours` query parameter is ignored.
  2. In `get_kpis`, `total_events` is computed via `select(func.count(SecurityEvent.id))` (real). However, `ai_accuracy=99.84`, `ai_f1_score=99.85`, `system_health=98.7`, `sensors_online=12`, `sensors_total=12`, `critical_change="+12%"`, and `blocked_change="+18%"` are hardcoded return values.
  3. If `total_events == 0`, fallback numbers (7 critical, 156 blocked, 24 incidents) are returned.
- **Status:** **CONFIRMED** (Medium Severity).
- **User Impact:** Threat Activity chart is an unmoving static curve; changing date filters has no effect.
- **Recommended Correction:** Implement real PostgreSQL time-bucket aggregation (`date_trunc('hour', created_at)`).

---

## 3. Disproved or Unverified Claims

1. **Claim: "Live Security Events panel is entirely fake"**
   - **Status:** **DISPROVED.**
   - **Evidence:** [`LiveEventsPanelEnhanced.tsx`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/components/dashboard/LiveEventsPanelEnhanced.tsx) correctly maps real records from `SecurityEvent` via `GET /api/v1/events/live`. Real Suricata alerts sent by the collector appear dynamically in this table.
2. **Claim: "Attack Distribution chart is hardcoded mock"**
   - **Status:** **DISPROVED.**
   - **Evidence:** [`backend/app/api/v1/dashboard.py:102-124`](file:///d:/fanos%20ai/-FANOS-AI/backend/app/api/v1/dashboard.py#L102-L124) executes real SQL `select(SecurityEvent.attack_type, func.count(SecurityEvent.id)).group_by(SecurityEvent.attack_type)`. It only falls back to mock data when the database table has zero records.
3. **Claim: "URI Assessment tool is completely fake"**
   - **Status:** **DISPROVED.**
   - **Evidence:** [`URIAssessmentPanel.tsx`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/components/dashboard/URIAssessmentPanel.tsx) executes a real HTTP POST to `/api/v1/web-security/assess`, which runs regex pattern rules from [`backend/app/ai/rule_engine.py`](file:///d:/fanos%20ai/-FANOS-AI/backend/app/ai/rule_engine.py) against the submitted path.

---

## 4. Build, Lint, and Test Baseline

- **Node/TypeScript Environment:** On the Windows host, `node_modules` is not installed directly; the frontend runs inside the Docker container `fanos-frontend-new:latest` on port 3000.
- **Backend Tests:** Running `test_fanos_v3_champion.py` inside the Docker backend container passes **17/17 tests** without errors.
- **Pre-existing Failures:** `test_infrastructure.py` references Zeek ingestion endpoints that were planned but never implemented in `infrastructure.py`.
