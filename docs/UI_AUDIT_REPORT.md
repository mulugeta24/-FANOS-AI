# FANOS AI — Complete UI Audit Report Before Redesign

**Audit Date:** October 2026  
**Auditor:** Senior Frontend Engineer & UI/UX Auditor  
**Scope:** Full-stack inspection of frontend (`/frontend`), backend (`/backend`), ML pipeline (`/backend/app/ai`), and Suricata ingestion (`/backend/app/api/v1/suricata_events.py`)  
**Status:** Audit Only — Zero source code, database, or style modifications made  

---

## Table of Contents
1. [A. Executive Summary](#a-executive-summary)
2. [B. Page & Route Inventory](#b-page--route-inventory)
3. [C. Functionality Matrix](#c-functionality-matrix)
4. [D. API Integration Matrix](#d-api-integration-matrix)
5. [E. Broken, Incomplete, and Visual-Only Features](#e-broken-incomplete-and-visual-only-features)
6. [F. Mock Data & Data Integrity Audit](#f-mock-data--data-integrity-audit)
7. [G. Visual Design & UI/UX Evaluation](#g-visual-design--uiux-evaluation)
8. [H. Missing Features](#h-missing-features)
9. [I. Prioritized Fix Plan (P0–P3)](#i-prioritized-fix-plan-p0p3)
10. [J. Redesign Blueprint](#j-redesign-blueprint)
11. [K. Verification Checklist](#k-verification-checklist)

---

## A. Executive Summary

### Overview & System Status
FANOS AI presents itself visually as a state-of-the-art, multi-tenant, SOC-grade cybersecurity platform featuring AI-powered threat detection, real-time intrusion monitoring, network telemetry inspection, and automated response capabilities. 

However, a rigorous inspection of the frontend codebase, backend routes, database schema, and machine learning pipeline reveals that **the user interface is currently a high-fidelity prototype operating primarily on simulated data, hardcoded mocks, and disconnected components.**

### Major Strengths
1. **Compelling Visual SOC Aesthetic:** Dark theme (`#080f1c`), polished color coding for threat severity (`#ef4444` Critical, `#f97316` High, `#f59e0b` Medium, `#00c8ff` Low), smooth micro-interactions, and clear card layouts provide a strong foundation for an enterprise SOC tool.
2. **Active Real-Time Telemetry Foundation:** The Suricata EVE JSON collector (`POST /api/v1/suricata/events` and `POST /api/v1/suricata/flows`) actively ingests live alerts and network flows from the Ubuntu sensor VM, persists records to the PostgreSQL `SecurityEvent` table, and evaluates flows using XGBoost inference and Redis deduplication.
3. **Working Real-Time Feed on Main Dashboard:** `LiveEventsPanelEnhanced` on `/dashboard` and `DetectionEvents` on `/detection/events` successfully consume real records from `GET /api/v1/events/live`.
4. **Interactive URI Assessment Tool:** `URIAssessmentPanel` on the main dashboard is fully functional end-to-end, sending target URIs to `POST /api/v1/web-security/assess` and receiving regex-based rule engine evaluation results.

### Critical Issues & Core Deficiencies
1. **The "Illusion of Real-Time SOC" (False Connected State):**
   - The top banner and header display `"LIVE · Production Connected"` and `"ALL SYSTEMS OPERATIONAL"` whenever a simple HTTP `GET /health` probe succeeds.
   - Meanwhile, **over 70% of the displayed dashboard telemetry** (threat activity time series, incident queues, blocked IPs, MITRE ATT&CK tactics, threat intel feeds, sensor counts, and system latencies) consists of hardcoded arrays or mock fallbacks.
2. **Complete Client-Side Authentication Bypass:**
   - `LoginPage.tsx` never calls the backend API (`/api/v1/auth/login`). It validates passwords against a hardcoded plaintext client dictionary (`DEMO_USERS`), issues a fake client token (`demo-token-${key}-${Date.now()}`), and stores it in `localStorage`.
   - `RequireAuth.tsx` only tests if `fanos_token` is non-empty; no JWT verification occurs.
   - `RegisterPage.tsx` creates real users in the PostgreSQL database, but these users **cannot log in**, because `LoginPage.tsx` only permits the four hardcoded demo accounts.
3. **Extensive Route Scaffolding:**
   - Out of 76 defined application routes in `App.tsx`, **36 routes (47.4%) render static placeholder components** (`Placeholder.tsx` or `AdminPlaceholder.tsx`) with the badge `"Live Data Integration Pending"`.
4. **Universal Error Swallowing:**
   - In `frontend/src/hooks/useDashboard.ts`, every React Query hook wraps its API promise in `withFallback(promise, mockData)`. If an endpoint returns 401, 404, or 500, the error is swallowed and mock data is silently rendered, hiding real system failures.
   - In `frontend/src/lib/api.ts`, sensor lifecycle actions (`startSensor`, `stopSensor`, `restartSensor`) catch HTTP errors and return `{ status: 'ONLINE' }`, falsely reporting success when backend commands fail.
5. **UI vs. Model Architecture Mismatch:**
   - The UI (`AIEngine.tsx` and `AIWorkflowPanel.tsx`) displays `"12 attack categories"`, `"46 network flow features"`, and `"NSL-KDD + CICIDS-2017"`.
   - In reality, the backend features the `16D_CHAMPION` XGBoost model operating on **70 features and 15 attack classes**, as well as `SURICATA_FLOW_NATIVE_V1` operating on **25 features**. The UI communicates outdated, inaccurate machine learning telemetry.

### Redesign Readiness Assessment
- **Architecture Readiness:** **Medium-Low.** The three-layout architecture (`Customer SOC`, `SecOps`, `Admin Portal`) creates navigation confusion and code duplication (e.g., duplicate user management and incident tables).
- **Backend Readiness:** **Medium.** Strong Suricata ingestion and ML pipeline; missing endpoints for Admin Portal, User Management, Reports, and Prevention DB persistence.
- **Redesign Recommendation:** **Do not start visual styling changes until the core data contracts, unified layouts, and authentication pathways are stabilized.**

---

## B. Page & Route Inventory

Across `frontend/src/App.tsx`, there are **76 registered routes** organized into 4 architectural zones.

### 1. Public Pages (No Layout)

| URL | Component | Purpose | Backend Endpoints | Data State | Readiness / Issues |
|---|---|---|---|---|---|
| `/` & `/home` | `LandingPage.tsx` | Marketing and platform landing page | None | Static | Working visual layout; links to `/login` and `/request-service`. |
| `/about` | `AboutPage.tsx` | Platform background and mission | None | Static | Working static marketing content. |
| `/contact` | `ContactPage.tsx` | Contact and inquiry form | None (mock state) | Simulated | Contact form shows alert on submit; no API persistence. |
| `/intelligence` | `IntelligencePage.tsx` | Public threat intelligence overview | None | Static | Visual marketing diagrams; no live intelligence feed. |
| `/security-guides` | `SecurityGuidesPage.tsx` | Cybersecurity documentation | None | Static | Static knowledge base articles. |
| `/request-service` | `RequestServicePage.tsx` | Service onboarding request form | None (local state) | Simulated | Form validates inputs; submission is visual-only. |
| `/portal-login` | `PortalSelectPage.tsx` | Gateway to choose workspace login | None | Static | Card links redirect to `/login`. |
| `/support-center` | `ContactPage.tsx` | Alias for support inquiries | None | Static | Alias to `/contact`. |
| `/register` | `RegisterPage.tsx` | New account registration | `POST /api/v1/auth/register` | Real DB | Hardcodes `http://localhost:8000`. User is inserted into DB, but cannot log in via `LoginPage.tsx`. |
| `/login` | `LoginPage.tsx` | Platform login portal | None (Client-side mock) | Hardcoded Mock | **CRITICAL SECURITY FLAW:** Hardcoded credentials; generates fake token; no API call. |
| `/login-help` | `LoginHelpPage.tsx` | Credential recovery instructions | None | Static | Informational recovery guide. |

---

### 2. Customer SOC Workspace (`AppLayout.tsx`)

| URL | Component | Purpose | Backend Endpoints | Data State | Readiness / Issues |
|---|---|---|---|---|---|
| `/dashboard` | `Dashboard.tsx` | Primary SOC dashboard | `/dashboard/kpis`, `/dashboard/threat-activity`, `/events/live`, `/incidents/active`, `/ai/engine/status`, `/web-security/stats`, `/web-security/assess` | Mixed (Real DB + Mock Fallback) | Real events feed; fake threat activity curve; hardcoded MITRE, Intel, and System Status panels. |
| `/detection/network` | `NetworkIDS.tsx` | Network intrusion detection telemetry | None | Hardcoded Mock | 100% static data arrays for packet rates and alerts. |
| `/detection/web` | `WebAttackDetection.tsx` | Web attack monitoring | None | Hardcoded Mock | 100% static data arrays for SQLi, XSS, and CSRF attempts. |
| `/detection/system` | `SystemDetection.tsx` | Host/system log analysis | None | Hardcoded Mock | 100% static data arrays for system log events. |
| `/detection/events` | `DetectionEvents.tsx` | Live streaming security events | `GET /api/v1/events/live` | Real DB | Works dynamically. "Filter" and "Export CSV" buttons have no handlers. |
| `/detection/endpoint` | `Placeholder.tsx` | Endpoint detection | None | Placeholder | Renders "Live Data Integration Pending". |
| `/detection/identity` | `Placeholder.tsx` | Identity & credential attacks | None | Placeholder | Renders "Live Data Integration Pending". |
| `/detection/cloud` | `Placeholder.tsx` | Multi-cloud workload monitor | None | Placeholder | Renders "Live Data Integration Pending". |
| `/detection/malware` | `Placeholder.tsx` | Signature/behavior malware | None | Placeholder | Renders "Live Data Integration Pending". |
| `/detection/ransomware`| `Placeholder.tsx` | Ransomware behavioral tracking | None | Placeholder | Renders "Live Data Integration Pending". |
| `/detection/phishing`  | `Placeholder.tsx` | Phishing email/URL analysis | None | Placeholder | Renders "Live Data Integration Pending". |
| `/detection/bots`      | `Placeholder.tsx` | Automated bot attack detection | None | Placeholder | Renders "Live Data Integration Pending". |
| `/detection/bruteforce`| `Placeholder.tsx` | SSH/RDP brute force monitoring | None | Placeholder | Renders "Live Data Integration Pending". |
| `/detection/rules`     | `Placeholder.tsx` | Suricata & custom rule tuning | None | Placeholder | Renders "Live Data Integration Pending". |
| `/prevention/blocking` | `Placeholder.tsx` | Active prevention engine | None | Placeholder | Renders "Live Data Integration Pending". |
| `/prevention/ips`      | `BlockedIPs.tsx` | IP block list management | None | Hardcoded Mock | Static `IPS` array; "Block IP" and "Unblock" buttons have no click handlers. |
| `/prevention/sessions` | `Placeholder.tsx` | Blocked user sessions | None | Placeholder | Renders "Live Data Integration Pending". |
| `/prevention/waf`      | `Placeholder.tsx` | WAF rule engine & bypasses | None | Placeholder | Renders "Live Data Integration Pending". |
| `/prevention/isolation`| `Placeholder.tsx` | Endpoint host quarantine | None | Placeholder | Renders "Live Data Integration Pending". |
| `/prevention/rules`    | `Placeholder.tsx` | Prevention rule thresholds | None | Placeholder | Renders "Live Data Integration Pending". |
| `/response/playbooks`  | `Placeholder.tsx` | Automated response playbooks | None | Placeholder | Renders "Live Data Integration Pending". |
| `/response/history` & `/prevention/history` | `Placeholder.tsx` | Prevention audit log | None | Placeholder | Renders "Live Data Integration Pending". |
| `/soc/alerts`          | `Alerts.tsx` | Priority security alerts | None | Hardcoded Mock | Static `ALERTS` array; "View" and "Ack" buttons have no handlers. |
| `/soc/threats`         | `Threats.tsx` | Threat intelligence feed | None | Hardcoded Mock | Static `THREATS` array; no external feed integration. |
| `/soc/incidents`       | `Incidents.tsx` | Incident response tracking | `GET /api/v1/incidents/active` | Mock (Backend hardcoded) | Backend returns hardcoded Python list; "New Incident" & "View" buttons have no handlers. |
| `/soc/timeline`        | `Placeholder.tsx` | Attack campaign timeline | None | Placeholder | Renders "Live Data Integration Pending". |
| `/soc/correlation`     | `Placeholder.tsx` | AI attack chain correlation | None | Placeholder | Renders "Live Data Integration Pending". |
| `/web/assessment`      | `Placeholder.tsx` | URI vulnerability assessment | None | Placeholder | Duplicate: main dashboard has working panel; this route is a placeholder. |
| `/web/requests`        | `Placeholder.tsx` | Web request logs | None | Placeholder | Renders "Live Data Integration Pending". |
| `/web/findings`        | `Placeholder.tsx` | Confirmed vulnerabilities | None | Placeholder | Renders "Live Data Integration Pending". |
| `/web/analytics`       | `Placeholder.tsx` | Web traffic threat analysis | None | Placeholder | Renders "Live Data Integration Pending". |
| `/ai/engine`           | `AIEngine.tsx` | XGBoost model status | `GET /api/v1/ai/engine/status` | Inconsistent | Backend reports 70 features & 15 classes; UI hardcodes 46 features & 12 classes. |
| `/ai/predictions`      | `Placeholder.tsx` | Real-time ML predictions | None | Placeholder | Renders "Live Data Integration Pending". |
| `/ai/performance`      | `Placeholder.tsx` | ROC curves & drift detection | None | Placeholder | Renders "Live Data Integration Pending". |
| `/ai/registry`         | `Placeholder.tsx` | Model versioning & rollback | None | Placeholder | Renders "Live Data Integration Pending". |
| `/ai/nas`              | `Placeholder.tsx` | Neural Architecture Search | None | Placeholder | Renders "Live Data Integration Pending". |
| `/infra/sensors`       | `Sensors.tsx` | Sensor health and counts | `GET /api/v1/infrastructure/sensors` | Hardcoded Backend | Returns static mock JSON from backend (`infrastructure.py`). |
| `/infra/network`       | `Placeholder.tsx` | Monitored network topology | None | Placeholder | Renders "Live Data Integration Pending". |
| `/infra/hosts`         | `Placeholder.tsx` | Monitored host inventory | None | Placeholder | Renders "Live Data Integration Pending". |
| `/infra/datasources`   | `Placeholder.tsx` | Ingestion pipeline health | None | Placeholder | Renders "Live Data Integration Pending". |
| `/analytics/security`  | `Placeholder.tsx` | MTTR & SOC metric charts | None | Placeholder | Renders "Live Data Integration Pending". |
| `/analytics/trends`    | `Placeholder.tsx` | Long-term attack trends | None | Placeholder | Renders "Live Data Integration Pending". |
| `/analytics/ai`        | `Placeholder.tsx` | ML model drift over time | None | Placeholder | Renders "Live Data Integration Pending". |
| `/analytics/reports`   | `Placeholder.tsx` | Executive report downloads | None | Placeholder | Renders "Live Data Integration Pending". |
| `/analysis/mitre`      | `Placeholder.tsx` | MITRE ATT&CK navigator | None | Placeholder | Renders "Live Data Integration Pending". |
| `/admin/orgs`          | `Placeholder.tsx` | Multi-tenant organization config| None | Placeholder | Renders "Live Data Integration Pending". |
| `/admin/users`         | `Users.tsx` | Platform user accounts | None | Hardcoded Mock | Static `USERS` array; Add/Edit/Delete buttons have no handlers. |
| `/admin/roles`         | `Placeholder.tsx` | RBAC role definitions | None | Placeholder | Renders "Live Data Integration Pending". |
| `/admin/audit`         | `AuditLogs.tsx` | Administrative action audit | None | Hardcoded Mock | Static `LOGS` array; no DB logging. |
| `/admin/api-keys`      | `Placeholder.tsx` | API key token generation | None | Placeholder | Renders "Live Data Integration Pending". |
| `/admin/settings`      | `Placeholder.tsx` | System preferences & SMTP | None | Placeholder | Renders "Live Data Integration Pending". |
| `/admin/sms`           | `SmsDashboard.tsx` | SMS alert gateway | `http://localhost:8000/api/v1/sms` | Real Backend | Real CRUD operations against SMS API; hardcoded URL. |
| `/admin/sms/settings`  | `SmsSettings.tsx` | SMS provider credentials | `http://localhost:8000/api/v1/sms/settings` | Real Backend | Real configuration form; hardcoded URL. |

---

### 3. Security Operations Workspace (`SecOpsLayout.tsx`)

| URL | Component | Purpose | Backend Endpoints | Data State | Readiness / Issues |
|---|---|---|---|---|---|
| `/secops/overview` | `SecOpsOverview.tsx` | SOC analyst situational overview | None | Hardcoded Mock | 100% static mock data arrays for alerts, incidents, and threat curves. |
| `/secops/alerts` | `SecOpsAlerts.tsx` | Unified alert triage queue | None | Hardcoded Mock | 100% static array; acknowledge/close buttons have no handlers. |
| `/secops/incidents` | `SecOpsIncidents.tsx` | Incident investigation queue | None | Hardcoded Mock | Duplicate of Customer SOC `/soc/incidents`; completely hardcoded. |
| `/secops/investigations` | `Investigations.tsx`| Threat hunting cases | None | Hardcoded Mock | Static `INVESTIGATIONS` array; "New Investigation" button has no handler. |
| `/secops/events` | `SecurityEvents.tsx` | Full raw event stream | `GET /api/v1/events/live` | Real DB | Reads live events; lacks row expansion and column sorting. |
| `/secops/network/zeek` | `ZeekPage.tsx` | Zeek connection, DNS, TLS logs | None | Hardcoded Mock | 100% static data arrays; no Zeek ingestion pipeline exists. |
| `/secops/network/suricata` | `SuricataPage.tsx` | Suricata IDS/IPS alert logs | None | Hardcoded Mock | **CRITICAL DISCONNECT:** Despite active Suricata collector, this page displays static arrays. |
| `/secops/web/waf` | `WAFPage.tsx` | WAF rule triggers & blocked URIs | None | Hardcoded Mock | 100% static data arrays; no live WAF connection. |
| `/secops/threat-intel` | `ThreatIntelligence.tsx` | IOC database & feed status | None | Hardcoded Mock | Static `IOCS` array; search filter works only in-memory. |
| `/secops/assets` | `SecOpsAssets.tsx` | Monitored asset security posture| None | Hardcoded Mock | Static `ASSETS` array; no dynamic asset discovery. |
| `/secops/reports` | `SecurityReports.tsx` | SOC compliance & summary reports| None | Hardcoded Mock | Static `REPORTS` list; "Download" and "Generate Report" buttons have no handlers. |

---

### 4. Admin Portal Workspace (`AdminLayout.tsx`)

| URL | Component | Purpose | Backend Endpoints | Data State | Readiness / Issues |
|---|---|---|---|---|---|
| `/admin-portal/overview` | `AdminOverview.tsx` | Tenant & customer overview | None | Hardcoded Mock | Static metrics (14 orgs, 48 customers, 24 deployments). |
| `/admin-portal/organizations` | `AdminOrganizations.tsx`| Tenant org management | None | Hardcoded Mock | Static org list; create org modal has no API call. |
| `/admin-portal/customers` | `AdminCustomers.tsx` | Customer subscriptions | None | Hardcoded Mock | Static customer table. |
| `/admin-portal/users` | `AdminUsersRoles.tsx` | Global user & role assignments | None | Hardcoded Mock | Duplicate of `/admin/users`; hardcoded user array. |
| `/admin-portal/requests` | `AdminRequests.tsx` | Service onboarding requests | None | Hardcoded Mock | Static request queue. |
| `/admin-portal/approvals` | `AdminApprovals.tsx` | Pending operational approvals | None | Hardcoded Mock | Static approval queue; Approve/Reject buttons visual-only. |
| `/admin-portal/deployments` | `AdminDeployments.tsx`| Sensor & agent deployments | None | Hardcoded Mock | Static deployment nodes. |
| `/admin-portal/audit` | `AdminAuditLogs.tsx` | Global administrative audit log| None | Hardcoded Mock | Duplicate of `/admin/audit`; static logs. |
| `/admin-portal/settings` | `AdminSettings.tsx` | Platform global configuration | None | Hardcoded Mock | Form inputs not connected to any backend endpoint. |
| `/admin-portal/assets` | `AdminPlaceholder.tsx` | Hardware asset inventory | None | Placeholder | Renders placeholder. |
| `/admin-portal/services` | `AdminPlaceholder.tsx` | Platform services health | None | Placeholder | Renders placeholder. |
| `/admin-portal/integrations`| `AdminPlaceholder.tsx`| SIEM / third-party connectors | None | Placeholder | Renders placeholder. |

---

## C. Functionality Matrix

| Page / Component | Expected Behavior | Actual Behavior | Data Source | Status | Evidence | Required Fix |
|---|---|---|---|---|---|---|
| **Login Form** (`LoginPage.tsx`) | Send credentials to `POST /api/v1/auth/login`, receive signed JWT, store securely, redirect by role. | Evaluates credentials against hardcoded `DEMO_USERS` client dictionary; issues fake token string. | Client-side memory | **Broken / Fake** | `LoginPage.tsx:84-100`: `localStorage.setItem('fanos_token', 'demo-token-...')` | Replace client validation with real Axios call to `/api/v1/auth/login`. |
| **Registration Form** (`RegisterPage.tsx`) | Register new user in DB, allow immediate login with new credentials. | Successfully inserts user into PostgreSQL DB, but user cannot log in because login only allows 4 hardcoded users. | PostgreSQL DB | **Partially Working** | `RegisterPage.tsx:71` calls `/api/v1/auth/register`, but `LoginPage.tsx` rejects new user. | Fix `LoginPage.tsx` to authenticate against backend database. |
| **Route Guard** (`RequireAuth.tsx`) | Validate JWT signature, check expiration, enforce workspace RBAC. | Checks if any non-empty string exists in `localStorage.getItem('fanos_token')`. | `localStorage` | **Broken / Vulnerable** | `RequireAuth.tsx:11-15`: Accepts any arbitrary string as a valid token. | Implement JWT decoding, expiration check, and backend validation. |
| **Live Events Stream** (`LiveEventsPanelEnhanced.tsx`) | Display real-time security events; clicking event row opens corresponding incident modal. | Fetches live events from API, but clicking any row with an incident always opens LockBit Ransomware modal. | Mixed (`GET /api/v1/events/live` + hardcoded mock) | **Partially Working** | `LiveEventsPanelEnhanced.tsx:186`: `onOpenIncident(CRITICAL_INCIDENT)` hardcoded for all clicks. | Pass dynamic event/incident payload to detail modal. |
| **Threat Activity Chart** (`ThreatActivityChart.tsx`) | Plot dynamic 24h event volume aggregated by hour from PostgreSQL database. | Displays static curve; backend returns hardcoded tuple array with zero database aggregation. | Hardcoded Backend | **Mocked** | `backend/app/api/v1/dashboard.py:81-99`: Hardcoded Python tuples `("00:00", 12, 8, ...)`. | Write SQL time-bucket query (`date_trunc('hour', created_at)`). |
| **Attack Distribution** (`AttackDistributionChart.tsx`) | Render donut chart of attack types from database events. | Executes SQL query `GROUP BY attack_type`; falls back to static array if database is empty. | Real DB | **Working** | `backend/app/api/v1/dashboard.py:102-124`: Real SQL aggregation. | Remove hardcoded fallback; show empty state when no events exist. |
| **URI Assessment Tool** (`URIAssessmentPanel.tsx`) | Validate target URI and return rule engine detection results. | POSTs to backend rule engine regex parser and renders real risk score and findings. | Real Backend API | **Working** | `backend/app/api/v1/web_security.py:43-60`: `rule_engine.evaluate_all(path)`. | Retain; add URI scanning history and payload export. |
| **Active Incidents Table** (`ActiveIncidentsTable.tsx`) | List active incidents from database; allow status change. | Reads from `/incidents/active`, but backend returns hardcoded in-memory Python objects. | In-Memory Backend | **Mocked** | `backend/app/api/v1/incidents.py:19-25`: `INCIDENTS = [IncidentOut(...)]`. | Persist incidents in PostgreSQL `Incident` model. |
| **Blocked IPs Page** (`BlockedIPs.tsx`) | Display firewall blocked IPs; allow blocking or unblocking an IP. | Displays hardcoded static array; "Block IP" and "Unblock" buttons have no `onClick` handlers. | Client-side memory | **Visual Only** | `BlockedIPs.tsx:4-13` (`const IPS = [...]`); lines 19 & 58: buttons lack handlers. | Connect to `/api/v1/prevention/blocked-ips` and implement CRUD handlers. |
| **Alerts Queue** (`Alerts.tsx`) | Display live alert triage queue; acknowledge or dismiss alerts. | Displays hardcoded static array; "View" and "Ack" buttons have no `onClick` handlers. | Client-side memory | **Visual Only** | `Alerts.tsx:5-13` (`const ALERTS = [...]`); lines 68 & 72: buttons lack handlers. | Query `SecurityEvent` where `status = 'ALERT'`; implement acknowledge mutation. |
| **AI Engine Telemetry** (`AIEngine.tsx`) | Display active XGBoost model architecture and real-time inference latency. | Shows hardcoded text "12 classes" and "46 features", contradicting backend's 70 features & 15 classes. | Inconsistent / Hardcoded | **Broken / Inaccurate** | `AIEngine.tsx:53-54` vs. `backend/app/ai/predictor.py:57-58`. | Wire metrics directly to `useAIEngineStatus()` API fields. |
| **Suricata Page** (`SuricataPage.tsx`) | Display live alerts and network signatures from Ubuntu Suricata sensor. | Displays static hardcoded array `SURICATA_ALERTS`; does not query backend despite active ingestion. | Client-side memory | **Visual Only** | `SuricataPage.tsx:12-19`: Hardcoded array; no API query hook used. | Query `GET /api/v1/events/live?sensor_source=suricata`. |
| **Sensor Lifecycle** (`api.ts`) | Start, stop, and restart network sensors via backend daemon. | Calls `/infrastructure/sensors/{id}/start` (which does not exist); catches 404 and returns fake `ONLINE`. | Swallowed Error | **Broken / Fake** | `frontend/src/lib/api.ts:120-127`: `.catch(() => ({ status: 'ONLINE' }))`. | Register `sensors.py` in `api_router`; fix URL route prefix. |
| **Header Search & ⌘K** (`Header.tsx`) | Search across threats, incidents, IPs, and entities with keyboard shortcut. | Input has no event handlers; `⌘K` badge is visual text with no keyboard listener. | None | **Visual Only** | `Header.tsx:58`: `<input>` has no `value` or `onChange`. | Implement global search dialog / Command palette. |
| **Header Time Picker** (`Header.tsx`) | Filter dashboard charts and tables by selected time range (1h, 24h, 7d). | Updates local state `timeRange`, but value is never passed to query hooks or dashboard components. | Local State | **Visual Only** | `Header.tsx:36`: `useState` value never exported or passed as prop. | Lift time range state to global context; pass `hours` to API hooks. |
| **Security Reports** (`SecurityReports.tsx`) | Generate compliance PDF reports; download past reports. | Displays static table; "Generate Report" and "Download" buttons have no handlers. | Client-side memory | **Visual Only** | `SecurityReports.tsx:85`: `<button><Download />Download</button>` lacks `onClick`. | Build real report export endpoints (CSV/PDF) or disable visual buttons. |
| **User Management** (`Users.tsx` / `AdminUsersRoles.tsx`)| View, invite, edit, and delete platform users and assign RBAC roles. | Both pages render static arrays; backend has no `/api/v1/users` endpoints at all. | Client-side memory | **Visual Only** | `backend/app/api` has no `/users` router; frontend buttons lack handlers. | Implement full user management API backed by PostgreSQL `User` table. |

---

## D. API Integration Matrix

| Frontend Feature / Component | Frontend Call (`lib/api.ts`) | Backend Endpoint (`backend/app/api`) | Backend Data Origin | Response Status | UI Integration State |
|---|---|---|---|---|---|
| **KPI Cards** | `getDashboardKPIs()` | `GET /api/v1/dashboard/kpis` | Hybrid: Real DB `COUNT(*)` for events; hardcoded 99.84% accuracy, 98.7% health, +12% changes. | 200 OK | **Partially Verified:** Total events is real; accuracy, health, and changes are hardcoded in backend. |
| **Threat Activity Chart** | `getThreatActivity(hours)` | `GET /api/v1/dashboard/threat-activity` | Hardcoded: Static 24h tuple array in `dashboard.py`. | 200 OK | **Simulated:** Returned data is static hardcoded numbers; time range parameter is ignored. |
| **Attack Distribution Donut** | `getAttackDistribution()` | `GET /api/v1/dashboard/attack-distribution` | Real DB: `SELECT attack_type, count(*) GROUP BY attack_type`. | 200 OK | **Verified Working:** Dynamic data rendered from PostgreSQL. |
| **Live Security Events** | `getLiveEvents(limit)` | `GET /api/v1/events/live` | Real DB: `SELECT * FROM security_events ORDER BY created_at DESC`. | 200 OK | **Verified Working:** Correctly displays real Suricata and ML events. |
| **Active Incidents Table** | `getActiveIncidents()` | `GET /api/v1/incidents/active` | In-Memory Python: Static list `INCIDENTS` in `incidents.py`. | 200 OK | **Mocked:** Data does not persist across backend restarts; not linked to DB. |
| **AI Engine Status** | `getAIEngineStatus()` | `GET /api/v1/ai/engine/status` | Dynamic: `ai_engine.get_status()` in `engine.py`. | 200 OK | **Verified Backend / Ignored in UI:** Backend returns 70 features & 15 classes; UI hardcodes 46 & 12. |
| **Sensor Health List** | `getSensors()` | `GET /api/v1/infrastructure/sensors` | Hardcoded: Static list in `infrastructure.py` (claims 6 sensors). | 200 OK | **Simulated:** Contradicts KPI endpoint which claims 12 sensors. |
| **Response Actions** | `getResponseActions(limit)`| `GET /api/v1/prevention/actions` | In-Memory Python: Hardcoded list in `prevention.py`. | 200 OK | **Mocked:** Static mock records. |
| **Prevention Status** | `getPreventionStatus()` | `GET /api/v1/prevention/status` | Hardcoded: Static numbers (blocked_sessions=23, waf_blocks=47). | 200 OK | **Mocked:** Static mock numbers. |
| **Web Security Stats** | `getWebSecurityStats()` | `GET /api/v1/web-security/stats` | Hardcoded: Static numbers (total_requests=12842, suspicious=342). | 200 OK | **Mocked:** Static mock numbers. |
| **URI Assessment** | `startURIAssessment(uri)` | `POST /api/v1/web-security/assess` | Dynamic: Evaluates URI path against `rule_engine.py`. | 200 OK | **Verified Working:** Real regex rule execution. |
| **Sensor Control** | `startSensor(id)` | `POST /api/v1/infrastructure/sensors/{id}/start` | **Non-existent:** Router uses `/sensors`, not `/infrastructure/sensors`. | 404 Not Found | **Broken / Masked:** Error swallowed by `.catch()`; returns fake `{ status: 'ONLINE' }`. |
| **Suricata Ingestion** | Collector daemon (Ubuntu) | `POST /api/v1/suricata/events` | Dynamic: Ingests Suricata alerts into PostgreSQL `security_events`. | 202 Accepted | **Verified Working:** Suricata collector successfully forwards alerts to DB. |
| **Suricata Flow Telemetry** | Collector daemon (Ubuntu) | `POST /api/v1/suricata/flows` | Dynamic: Ingests network flows; runs XGBoost inference; saves to DB. | 202 Accepted | **Verified Working:** Real ML inference executed per flow. |
| **User Authentication** | None (Client-side mock) | `POST /api/v1/auth/login` | Real DB: Exists in `auth.py`, but frontend never calls it. | Not Called | **Broken:** Completely bypassed by frontend `LoginPage.tsx`. |

---

## E. Broken, Incomplete, and Visual-Only Features

### 1. Broken Features (Workflow Fails or Produces Incorrect Results)
- **User Authentication Workflow:** Newly registered users cannot log in. `RegisterPage.tsx` registers users via API into PostgreSQL, but `LoginPage.tsx` validates against local memory only.
- **Sensor Control Actions:** Starting, stopping, or restarting a sensor in the UI always fails with HTTP 404 (due to prefix mismatch `/infrastructure/sensors` vs `/sensors`), but the failure is masked by a `.catch()` block that reports `{ status: 'ONLINE' }`.
- **Incident Modal Linkage:** Clicking any row in `LiveEventsPanelEnhanced.tsx` opens the hardcoded `"LockBit Ransomware Pattern"` modal, regardless of the clicked event’s actual ID or threat type.
- **AI Architecture Statistics:** `AIEngine.tsx` displays 46 network features and 12 attack classes, whereas the deployed backend ML model (`16D_CHAMPION`) uses 70 features and 15 classes.

### 2. Visual-Only Elements (Interactive in Appearance, Zero Functionality)
- **Header Global Search Input:** `<input placeholder="Search threats..."/>` in `Header.tsx` lacks `onChange` and form submission handlers.
- **Header ⌘K Shortcut:** Displays visual keyboard shortcut badge, but has no keydown listener.
- **Header Time Range Dropdown:** Allows selecting "Last 1 Hour", "Last 24 Hours", etc., but the selection is stored in unexported local state and does not filter any queries.
- **Header Notification Bell:** Shows hardcoded badge `"7"` with no click handler or notification popover.
- **Filter and Export Buttons in Detection Events:** `<button>Filter</button>` and `<button>Export CSV</button>` in `DetectionEvents.tsx` lack `onClick` handlers.
- **Block IP & Unblock Actions:** In `BlockedIPs.tsx`, `<button>Block IP</button>` and `<button>Unblock</button>` have no event handlers.
- **Alert Queue Actions:** In `Alerts.tsx`, `<button>View</button>` and `<button>Ack</button>` have no event handlers.
- **Incident Queue Actions:** In `Incidents.tsx`, `<button>New Incident</button>` and `<button>View</button>` have no event handlers.
- **Report Generation & Download:** In `SecurityReports.tsx`, `<button>Generate Report</button>` and `<button>Download</button>` have no event handlers.
- **User Management Actions:** In `Users.tsx` and `AdminUsersRoles.tsx`, `<button>Add User</button>`, `<button>Edit</button>`, and `<button>Delete</button>` have no event handlers.
- **Dark Mode Toggle:** In `UserMenu.tsx`, the "Dark Mode" menu item has an empty callback `onClick={() => {}}`.

### 3. Incomplete Features (Partially Implemented)
- **Admin Portal Workspace:** All 12 routes in `/admin-portal/*` operate on hardcoded static mock arrays; there are no corresponding backend endpoints in `backend/app/api`.
- **Security Operations Workspace:** Pages `/secops/overview`, `/secops/alerts`, `/secops/investigations`, `/secops/assets`, `/secops/network/zeek`, and `/secops/network/suricata` are built with static arrays rather than dynamic API queries.
- **36 Placeholder Routes:** Nearly half the application routes render `Placeholder.tsx` with `"Live Data Integration Pending"`.

---

## F. Mock Data & Data Integrity Audit

### 1. Universal Error Swallowing (`useDashboard.ts`)
In `frontend/src/hooks/useDashboard.ts`, every hook wraps its promise:
```typescript
function withFallback<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return promise.catch(() => fallback)
}
```
**Impact:** If the backend database crashes, if an API token expires, or if an endpoint returns HTTP 500, the user never sees an error state. The dashboard seamlessly substitutes fake mock data, deceiving SOC analysts into believing the environment is operational.

### 2. Fabricated System Telemetry
The following components display 100% fabricated numbers as live telemetry:
- **`SystemStatusPanel.tsx`:** Claims `247/248 Endpoint Agents`, `3 WAFs`, `2 API Gateways`, `5 Cloud Connectors`, and `1,284 events/sec`. In reality, only 1 Suricata VM sensor is active.
- **`backend/app/api/v1/dashboard.py` (`get_kpis`):**
  - Accuracy hardcoded to `99.84%`
  - F1 score hardcoded to `99.85%`
  - Health hardcoded to `98.7%`
  - Sensors online hardcoded to `12/12`
  - Critical change hardcoded to `+12%`
  - If database event counts equal 0, the backend returns default fake numbers (`7` critical threats, `156` blocked threats, `24` active incidents).
- **`backend/app/api/v1/dashboard.py` (`get_threat-activity`):** The entire 24-hour time series is a hardcoded list of Python tuples; no database timestamps are queried.
- **`backend/app/api/v1/web_security.py` (`get_web_stats`):** Returns static numbers (`12842` requests, `342` suspicious) with no database connection.

### 3. Credential & Secret Exposure
- In `frontend/src/pages/LoginPage.tsx` (lines 15–40), plaintext administrative and analyst passwords (`FanosAdmin2026!`, `Fanos4561644@`, `SocAnalyst2026!`, `Customer2026!`) are hardcoded directly in the client bundle.
- In `frontend/src/pages/RegisterPage.tsx` and `frontend/src/pages/admin/sms/SmsDashboard.tsx`, backend URLs are hardcoded as `http://localhost:8000`, breaking any deployment where the backend is hosted under a domain, Docker network, or reverse proxy.

---

## G. Visual Design & UI/UX Evaluation

### 1. Usability & Information Architecture
- **Three-Workspace Disconnect:** Having `Customer SOC`, `Security Operations`, and `Admin Portal` split across different layouts with duplicate pages (`/soc/incidents` vs `/secops/incidents`; `/admin/users` vs `/admin-portal/users`) creates severe user confusion.
- **High Visual Density on Main Dashboard:** `Dashboard.tsx` stacks 10 rows of cards, charts, and tables on a single page, resulting in overwhelming cognitive load for a SOC analyst.
- **Lack of Search and Filter State:** Tables (Live Events, Alerts, Incidents) lack dynamic filtering, pagination, and persistent search parameters.

### 2. Visual Polish & Styling
- **Color Contrast:** Deep dark backgrounds (`#080f1c`) with cyan (`#00c8ff`) and emerald (`#00e5a0`) accents provide excellent contrast for dark room SOC monitoring.
- **Typography:** Uses clean sans-serif typography with monospace font for IP addresses and timestamps (`font-mono text-[11px]`).
- **Responsive Design:**
  - Desktop (1440px+): Well-aligned multi-column grid layouts.
  - Tablet / Laptop (1024px): Minor horizontal overflow in `LiveEventsPanelEnhanced` and `ThreatActivityChart`.
  - Mobile (375px–768px): The fixed sidebar and multi-column tables break significantly; horizontal scrolling is required.

### 3. Accessibility & Keyboard Navigation
- Interactive table rows lack `tabIndex={0}`, keyboard focus outlines, and `aria-expanded` attributes.
- Modal dialogs (`IncidentDetailModal.tsx`) lack focus trapping and Escape key listeners.
- Search input in header has no associated `<label>` element.

---

## H. Missing Features

### Essential SOC Functionality (Must-Have Before Production)
1. **Real Incident Management Engine:** Persistent database model for Incidents, allowing analysts to create incidents from alerts, assign analysts, change status (Open, Investigating, Contained, Closed), and record investigation notes.
2. **Dynamic Alert Triage Workflow:** Real endpoint to acknowledge, dismiss, escalate, or group incoming Suricata alerts.
3. **Suricata Live View Integration:** Dedicated view on `/secops/network/suricata` that queries real Suricata alerts from PostgreSQL with signature filtering.
4. **Active IP Blocking Engine:** Ability to send an IP to an active blocking table that integrates with host firewall / iptables rules.
5. **Real User Management:** API-backed user creation, password resets, role assignment, and session termination.
6. **Time-Range Filtering:** Working time picker in the header that filters all telemetry by 1h, 6h, 24h, 7d, 30d.

### Optional Enhancements (Future Releases)
1. **Interactive MITRE ATT&CK Navigator:** Real-time mapping of detected attack signatures to MITRE tactic IDs.
2. **CSV / PDF Report Export:** Automated report generation for compliance and management.
3. **Dark / Light Theme Toggle:** Accessible high-contrast light mode option.
4. **WebSocket Streaming:** Replace 6-second polling with real-time WebSocket / SSE push for incoming security events.

---

## I. Prioritized Fix Plan

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRIORITIZED FIX ROADMAP                         │
├──────────────┬─────────────────────────────────────────────────────────┤
│ P0: Critical │ Real Auth, Remove Hardcoded Passwords, Stop Fake Errors │
├──────────────┼─────────────────────────────────────────────────────────┤
│ P1: Core Fix │ Wire Suricata Page, Real Threat Timeseries, Incidents DB│
├──────────────┼─────────────────────────────────────────────────────────┤
│ P2: UX & SOC │ Unify Workspaces, Header Search/Time Filters, Table UX  │
├──────────────┼─────────────────────────────────────────────────────────┤
│ P3: Polish   │ Prune 36 Placeholders, Mobile Responsiveness, WebSockets│
└──────────────┴─────────────────────────────────────────────────────────┘
```

### P0 — Critical Security & Integrity (Must Fix First)
- **P0.1: Fix Authentication & Remove Hardcoded Passwords:** Remove `DEMO_USERS` and plaintext passwords from `LoginPage.tsx`. Connect login directly to `POST /api/v1/auth/login`. Update `RequireAuth.tsx` to validate real JWT tokens.
- **P0.2: Remove Silent Error Fallbacks:** Modify `useDashboard.ts` to stop using `withFallback()`. Allow React Query to expose real `isError` states and render clean error banners when endpoints fail.
- **P0.3: Fix Sensor Control Routes:** Update `api.ts` to call `/api/v1/sensors/...` instead of `/api/v1/infrastructure/sensors/...`. Register `sensors.router` in `backend/app/api/v1/__init__.py`. Stop catching 404 errors with fake `{ status: 'ONLINE' }`.
- **P0.4: Fix Hardcoded URLs:** Replace all instances of `http://localhost:8000` in `RegisterPage.tsx` and `SmsDashboard.tsx` with relative `/api/v1` paths.

### P1 — Core SOC Features Broken or Misleading
- **P1.1: Connect Suricata Page to Real Ingestion:** Wire `SuricataPage.tsx` to query `GET /api/v1/events/live?sensor_source=suricata` so live alerts forwarded by the Ubuntu VM collector are actually visible on the dedicated Suricata page.
- **P1.2: Real Database Time Series for Threat Activity:** Replace static tuples in `backend/app/api/v1/dashboard.py` with real SQL time-bucket queries.
- **P1.3: Real Database Persistence for Incidents:** Migrate `incidents.py` from in-memory Python lists to the PostgreSQL `Incident` model. Implement "New Incident" and "Update Status" mutations.
- **P1.4: Correct AI Model Telemetry:** Update `AIEngine.tsx` to display real model metadata (70 features, 15 attack classes) matching the `16D_CHAMPION` XGBoost model.

### P2 — Important Usability & Workflow Improvements
- **P2.1: Workspace & Navigation Consolidation:** Consolidate `Customer SOC` and `SecOps` into a single unified SOC layout. Eliminate duplicate routes (`/soc/incidents` vs `/secops/incidents`; `/admin/users` vs `/admin-portal/users`).
- **P2.2: Working Header Time Filter:** Move `timeRange` to a global React Context; pass the selected time parameter into all dashboard API queries.
- **P2.3: Interactive Table Buttons:** Wire click handlers for "Block IP", "Acknowledge Alert", "Filter", and "Export".
- **P2.4: Dynamic Event Detail Drawer:** Replace the hardcoded LockBit modal with a slide-out drawer rendering dynamic raw event details for the clicked event.

### P3 — Redesign Cleanup & Polish
- **P3.1: Prune 36 Placeholder Routes:** Hide or disable unimplemented routes in the sidebar rather than displaying dead-end placeholder pages.
- **P3.2: Mobile & Tablet Responsiveness:** Implement collapsing sidebars and card-based table representations for viewports under 1024px.
- **P3.3: WebSocket Live Event Stream:** Upgrade from 6-second polling to Server-Sent Events (SSE) or WebSockets for instant alert notifications.

---

## J. Redesign Blueprint

### Proposed Unified Information Architecture
Rather than maintaining 3 separate layout workspaces that fragment features, the redesign should establish a single, role-gated platform:

```
FANOS AI Platform (Unified Layout)
├── 1. Security Overview (Primary SOC Dashboard)
│   ├── Real KPI Header (Dynamic from DB)
│   ├── Threat Activity Timeline (SQL Time-Series)
│   ├── Live Event Stream (Suricata + ML Flows)
│   └── Quick Actions Drawer (Investigate, Block, Triage)
├── 2. Threat Detection & Ingestion
│   ├── Suricata Network IDS (Real EVE Alerts)
│   ├── ML Flow Telemetry (XGBoost 70-feature classifications)
│   └── Web Security & URI Assessment (Active rule engine)
├── 3. Incident Response & Prevention
│   ├── Active Incidents (Full DB CRUD & Notes)
│   ├── Alert Triage Queue (Acknowledge / Resolve)
│   └── Prevention Center (Real IP Blocklist)
├── 4. AI & Model Intelligence
│   ├── Model Registry & Telemetry (16D_CHAMPION status)
│   └── Explainability & Feature Importance
└── 5. Platform Administration (Role-gated: Admin only)
    ├── User & RBAC Management (PostgreSQL Users DB)
    ├── Sensor Nodes & Collector Health (Live heartbeats)
    └── SMS Gateway Configuration
```

### Component Architecture & Design System Tokens
- **Design Tokens:**
  - Surface Dark: `#070d18`, `#0b1424`, `#101b2f`
  - Threat Red (Critical): `#ef4444` (Bg: `rgba(239, 68, 68, 0.12)`)
  - Threat Orange (High): `#f97316` (Bg: `rgba(249, 115, 22, 0.12)`)
  - Threat Amber (Medium): `#f59e0b` (Bg: `rgba(245, 158, 11, 0.12)`)
  - Threat Cyan (Low / Info): `#00c8ff` (Bg: `rgba(0, 200, 255, 0.10)`)
  - Success Green (Operational): `#00e5a0` (Bg: `rgba(0, 229, 160, 0.10)`)
- **Core Reusable Components to Build:**
  1. `<ThreatBadge severity="CRITICAL" />` (Standardized severity pill)
  2. `<DynamicDataTable columns={...} data={...} onRowClick={...} />` (With sorting, pagination, empty states)
  3. `<EventDetailDrawer event={selectedEvent} onClose={...} />` (Dynamic JSON payload viewer)
  4. `<ConfirmationModal title="..." onConfirm={...} />` (For IP blocking and incident closure)
  5. `<ErrorBanner error={...} onRetry={...} />` (Replaces silent mock fallback)

---

## K. Verification Checklist

Use this checklist during and after the redesign to verify that all audit findings have been resolved:

- [ ] **Authentication:** Login uses `POST /api/v1/auth/login`; demo passwords removed from frontend bundle.
- [ ] **Registration:** Newly registered user can log in immediately with their credentials.
- [ ] **Token Validation:** `RequireAuth.tsx` verifies JWT token structure and expiration.
- [ ] **No Silent Fallbacks:** Killing the backend produces visible error banners; mock data is not secretly injected.
- [ ] **Live Suricata View:** Alerts sent via Ubuntu collector appear on the dedicated Suricata view within 6 seconds.
- [ ] **Dynamic Threat Time-Series:** Changing time filter dynamically adjusts the threat volume chart using SQL time buckets.
- [ ] **Dynamic Incidents:** Adding or editing an incident persists in PostgreSQL and survives server restarts.
- [ ] **Correct AI Metrics:** AI Engine page correctly reflects 70 features, 15 classes, and real inference latency.
- [ ] **Sensor Lifecycle:** Sensor start/stop commands hit registered `/api/v1/sensors` routes and report real daemon statuses.
- [ ] **Interactive Buttons:** Every button (Block IP, Export CSV, Filter, Acknowledge, Download) triggers an active handler or is cleanly removed.
- [ ] **Responsive View:** Dashboard renders legibly without horizontal layout breaks down to 768px tablet resolution.

---
*End of FANOS AI UI Audit Report.*
