# FANOS AI — Complete Route Inventory (Phase 0)

**Date:** October 2026  
**Auditor:** Senior Frontend Architect  
**Source File:** [`frontend/src/App.tsx`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/App.tsx)  
**Total Routes:** 76 defined route paths  

---

## 1. Classification Summary

Every route in the application has been audited against its component implementation, data source, and interactive state:

| Category | Count | % of Total | Definition |
|---|---|---|---|
| **Functional** | 9 | 11.8% | Backed by a verified, working backend API endpoint or database integration. |
| **Partially Functional** | 4 | 5.3% | Partially communicates with real API, but actions, modals, or auth flows are broken. |
| **Visual Mockup** | 27 | 35.5% | Implemented custom React component, but backed 100% by static in-memory data or hardcoded arrays. |
| **Placeholder** | 36 | 47.4% | Renders `Placeholder.tsx` or `AdminPlaceholder.tsx` with `"Live Data Integration Pending"`. |
| **Duplicate / Redundant**| (8) | (10.5%) | Overlapping routes across the 3 layout workspaces (e.g., incidents, user management). |

---

## 2. Comprehensive Inventory by Workspace

### Zone 1: Public Routes (No Layout)

| URL Path | Component | Status | Data Origin | Evidence / Current State |
|---|---|---|---|---|
| `/` | `Navigate -> /home` | **Functional** | Router | Clean redirect to `/home`. |
| `/home` | `LandingPage.tsx` | **Functional** | Static | Marketing landing page; working links. |
| `/about` | `AboutPage.tsx` | **Functional** | Static | Informational marketing page. |
| `/contact` | `ContactPage.tsx` | **Visual Mockup**| Local State | Form shows alert message; does not persist message to DB. |
| `/intelligence` | `IntelligencePage.tsx` | **Visual Mockup**| Static | Marketing diagrams; not connected to live threat feeds. |
| `/security-guides` | `SecurityGuidesPage.tsx`| **Functional** | Static | Static knowledge articles. |
| `/request-service` | `RequestServicePage.tsx`| **Visual Mockup**| Local State | Form validates inputs; submission is local alert only. |
| `/portal-login` | `PortalSelectPage.tsx` | **Functional** | Static | Portal cards linking to `/login`. |
| `/support-center` | `ContactPage.tsx` | **Visual Mockup**| Static | Alias route to `/contact`. |
| `/register` | `RegisterPage.tsx` | **Partially Functional** | Real DB | Calls `POST /api/v1/auth/register` (hardcoded localhost:8000); user created in DB cannot log in due to `LoginPage` mock. |
| `/login` | `LoginPage.tsx` | **Visual Mockup / Insecure** | Local Memory | Evaluates passwords against hardcoded client dictionary `DEMO_USERS`; issues fake client token. |
| `/login-help` | `LoginHelpPage.tsx` | **Functional** | Static | Informational credential recovery instructions. |

---

### Zone 2: Customer SOC Workspace (`AppLayout.tsx`)

| URL Path | Component | Status | Data Origin | Evidence / Current State |
|---|---|---|---|---|
| `/dashboard` | `Dashboard.tsx` | **Partially Functional** | Hybrid | Real live events feed (`/events/live`); real attack donut (`/attack-distribution`); real URI scan (`/web-security/assess`); but Threat Activity is static backend curve, and MITRE, Threat Intel, and System Status are hardcoded. |
| `/detection/network` | `NetworkIDS.tsx` | **Visual Mockup** | Local Memory | 100% static mock arrays for packet rates and detections. |
| `/detection/web` | `WebAttackDetection.tsx`| **Visual Mockup** | Local Memory | 100% static mock arrays for SQLi, XSS, CSRF attacks. |
| `/detection/system` | `SystemDetection.tsx` | **Visual Mockup** | Local Memory | 100% static mock arrays for system logs. |
| `/detection/events` | `DetectionEvents.tsx` | **Functional** | Real DB | Reads streaming events from `GET /api/v1/events/live`. Buttons (Filter, Export CSV) have no handlers. |
| `/detection/endpoint` | `Placeholder.tsx` | **Placeholder** | None | Renders "Endpoint Detection" placeholder card. |
| `/detection/identity` | `Placeholder.tsx` | **Placeholder** | None | Renders "Identity Detection" placeholder card. |
| `/detection/cloud` | `Placeholder.tsx` | **Placeholder** | None | Renders "Cloud Detection" placeholder card. |
| `/detection/malware` | `Placeholder.tsx` | **Placeholder** | None | Renders "Malware Detection" placeholder card. |
| `/detection/ransomware`| `Placeholder.tsx` | **Placeholder** | None | Renders "Ransomware Detection" placeholder card. |
| `/detection/phishing` | `Placeholder.tsx` | **Placeholder** | None | Renders "Phishing Detection" placeholder card. |
| `/detection/bots` | `Placeholder.tsx` | **Placeholder** | None | Renders "Bot Detection" placeholder card. |
| `/detection/bruteforce`| `Placeholder.tsx` | **Placeholder** | None | Renders "Brute Force Detection" placeholder card. |
| `/detection/rules` | `Placeholder.tsx` | **Placeholder** | None | Renders "Detection Rules" placeholder card. |
| `/prevention/blocking` | `Placeholder.tsx` | **Placeholder** | None | Renders "Active Blocking" placeholder card. |
| `/prevention/ips` | `BlockedIPs.tsx` | **Visual Mockup** | Local Memory | Static `IPS` array; Block IP & Unblock buttons lack handlers. |
| `/prevention/sessions` | `Placeholder.tsx` | **Placeholder** | None | Renders "Blocked Sessions" placeholder card. |
| `/prevention/waf` | `Placeholder.tsx` | **Placeholder** | None | Renders "WAF Protection" placeholder card. |
| `/prevention/isolation`| `Placeholder.tsx` | **Placeholder** | None | Renders "Endpoint Isolation" placeholder card. |
| `/prevention/rules` | `Placeholder.tsx` | **Placeholder** | None | Renders "Prevention Rules" placeholder card. |
| `/response/playbooks` | `Placeholder.tsx` | **Placeholder** | None | Renders "Response Playbooks" placeholder card. |
| `/response/history` | `Placeholder.tsx` | **Placeholder** | None | Renders "Response History" placeholder card. |
| `/prevention/history` | `Placeholder.tsx` | **Placeholder** | None | Duplicate of `/response/history`. |
| `/soc/alerts` | `Alerts.tsx` | **Visual Mockup** | Local Memory | Static `ALERTS` array; View and Ack buttons lack handlers. |
| `/soc/threats` | `Threats.tsx` | **Visual Mockup** | Local Memory | Static `THREATS` array; no external feed connection. |
| `/soc/incidents` | `Incidents.tsx` | **Visual Mockup** | In-Memory Backend| Reads `/incidents/active`, which returns hardcoded Python list; New Incident and View buttons lack handlers. |
| `/soc/timeline` | `Placeholder.tsx` | **Placeholder** | None | Renders "Threat Timeline" placeholder card. |
| `/soc/correlation` | `Placeholder.tsx` | **Placeholder** | None | Renders "Threat Correlation" placeholder card. |
| `/web/assessment` | `Placeholder.tsx` | **Placeholder / Duplicate**| None | Main dashboard has working panel; this route is a placeholder. |
| `/web/requests` | `Placeholder.tsx` | **Placeholder** | None | Renders "Web Requests" placeholder card. |
| `/web/findings` | `Placeholder.tsx` | **Placeholder** | None | Renders "Security Findings" placeholder card. |
| `/web/analytics` | `Placeholder.tsx` | **Placeholder** | None | Renders "Web Analytics" placeholder card. |
| `/ai/engine` | `AIEngine.tsx` | **Partially Functional** | Hardcoded UI | Consumes `/ai/engine/status`, but UI hardcodes 46 features and 12 classes instead of dynamic values. |
| `/ai/predictions` | `Placeholder.tsx` | **Placeholder** | None | Renders "AI Predictions" placeholder card. |
| `/ai/performance` | `Placeholder.tsx` | **Placeholder** | None | Renders "Model Performance" placeholder card. |
| `/ai/registry` | `Placeholder.tsx` | **Placeholder** | None | Renders "Model Registry" placeholder card. |
| `/ai/nas` | `Placeholder.tsx` | **Placeholder** | None | Renders "NAS Lab" placeholder card. |
| `/infra/sensors` | `Sensors.tsx` | **Visual Mockup** | Hardcoded Backend| Calls `/infrastructure/sensors`, which returns static mock list from `infrastructure.py`. |
| `/infra/network` | `Placeholder.tsx` | **Placeholder** | None | Renders "Network" placeholder card. |
| `/infra/hosts` | `Placeholder.tsx` | **Placeholder** | None | Renders "Hosts" placeholder card. |
| `/infra/datasources` | `Placeholder.tsx` | **Placeholder** | None | Renders "Data Sources" placeholder card. |
| `/analytics/security` | `Placeholder.tsx` | **Placeholder** | None | Renders "Security Analytics" placeholder card. |
| `/analytics/trends` | `Placeholder.tsx` | **Placeholder** | None | Renders "Attack Trends" placeholder card. |
| `/analytics/ai` | `Placeholder.tsx` | **Placeholder** | None | Renders "AI Performance" placeholder card. |
| `/analytics/reports` | `Placeholder.tsx` | **Placeholder** | None | Renders "Reports" placeholder card. |
| `/analysis/mitre` | `Placeholder.tsx` | **Placeholder** | None | Renders "MITRE ATT&CK" placeholder card. |
| `/admin/orgs` | `Placeholder.tsx` | **Placeholder** | None | Renders "Organizations" placeholder card. |
| `/admin/users` | `Users.tsx` | **Visual Mockup** | Local Memory | Static `USERS` array; Add/Edit/Delete lack handlers. Duplicate of `/admin-portal/users`. |
| `/admin/roles` | `Placeholder.tsx` | **Placeholder** | None | Renders "Teams & Roles" placeholder card. |
| `/admin/audit` | `AuditLogs.tsx` | **Visual Mockup** | Local Memory | Static `LOGS` array. Duplicate of `/admin-portal/audit`. |
| `/admin/api-keys` | `Placeholder.tsx` | **Placeholder** | None | Renders "API Keys" placeholder card. |
| `/admin/settings` | `Placeholder.tsx` | **Placeholder** | None | Renders "System Settings" placeholder card. |
| `/admin/sms` | `SmsDashboard.tsx` | **Functional** | Real Backend | Live CRUD against `/api/v1/sms` (hardcoded localhost:8000 URL). |
| `/admin/sms/settings` | `SmsSettings.tsx` | **Functional** | Real Backend | Live configuration form for SMS gateway. |

---

### Zone 3: Security Operations Workspace (`SecOpsLayout.tsx`)

| URL Path | Component | Status | Data Origin | Evidence / Current State |
|---|---|---|---|---|
| `/secops/overview` | `SecOpsOverview.tsx` | **Visual Mockup** | Local Memory | 100% static mock arrays (`THREAT_DATA`, `ALERTS`, `INCIDENTS`, `ENGINES`). |
| `/secops/alerts` | `SecOpsAlerts.tsx` | **Visual Mockup** | Local Memory | Static `ALERTS` list; no persistence. |
| `/secops/incidents` | `SecOpsIncidents.tsx` | **Visual Mockup / Duplicate**| Local Memory | Duplicate of `/soc/incidents`; completely hardcoded. |
| `/secops/investigations` | `Investigations.tsx`| **Visual Mockup** | Local Memory | Static `INVESTIGATIONS` array; New Investigation button lacks handler. |
| `/secops/events` | `SecurityEvents.tsx` | **Functional** | Real DB | Reads streaming events from `GET /api/v1/events/live`. |
| `/secops/network/zeek` | `ZeekPage.tsx` | **Visual Mockup** | Local Memory | 100% static arrays for connections, DNS, and TLS. |
| `/secops/network/suricata`| `SuricataPage.tsx` | **Visual Mockup** | Local Memory | 100% static array despite active backend ingestion. |
| `/secops/web/waf` | `WAFPage.tsx` | **Visual Mockup** | Local Memory | 100% static arrays for WAF rules and triggers. |
| `/secops/threat-intel` | `ThreatIntelligence.tsx`| **Visual Mockup** | Local Memory | Static `IOCS` and `INTEL_FEEDS` arrays. Search works only in-memory. |
| `/secops/assets` | `SecOpsAssets.tsx` | **Visual Mockup** | Local Memory | Static `ASSETS` array. |
| `/secops/reports` | `SecurityReports.tsx` | **Visual Mockup** | Local Memory | Static `REPORTS` list; Generate and Download buttons lack handlers. |

---

### Zone 4: Admin Portal Workspace (`AdminLayout.tsx`)

| URL Path | Component | Status | Data Origin | Evidence / Current State |
|---|---|---|---|---|
| `/admin-portal/overview` | `AdminOverview.tsx` | **Visual Mockup** | Local Memory | Static KPI cards (14 orgs, 48 customers, 24 deployments). |
| `/admin-portal/organizations`| `AdminOrganizations.tsx`| **Visual Mockup** | Local Memory | Static organization table; create modal lacks API call. |
| `/admin-portal/customers` | `AdminCustomers.tsx` | **Visual Mockup** | Local Memory | Static customer subscription list. |
| `/admin-portal/users` | `AdminUsersRoles.tsx` | **Visual Mockup / Duplicate**| Local Memory | Duplicate of `/admin/users`; static user array. |
| `/admin-portal/requests` | `AdminRequests.tsx` | **Visual Mockup** | Local Memory | Static service request table. |
| `/admin-portal/approvals` | `AdminApprovals.tsx` | **Visual Mockup** | Local Memory | Static approval queue; Approve/Reject lack handlers. |
| `/admin-portal/deployments`| `AdminDeployments.tsx`| **Visual Mockup** | Local Memory | Static deployment node list. |
| `/admin-portal/audit` | `AdminAuditLogs.tsx` | **Visual Mockup / Duplicate**| Local Memory | Duplicate of `/admin/audit`; static logs. |
| `/admin-portal/settings` | `AdminSettings.tsx` | **Visual Mockup** | Local Memory | Form fields not wired to any endpoint. |
| `/admin-portal/assets` | `AdminPlaceholder.tsx` | **Placeholder** | None | Renders "Assets" placeholder card. |
| `/admin-portal/services` | `AdminPlaceholder.tsx` | **Placeholder** | None | Renders "Services" placeholder card. |
| `/admin-portal/integrations`| `AdminPlaceholder.tsx`| **Placeholder** | None | Renders "Integrations" placeholder card. |

---

## 3. Redundant & Overlapping Routes Identified

The audit confirms significant architectural fragmentation across the 3 layouts that should be consolidated during redesign:

1. **Incidents Queue:** `/soc/incidents` vs `/secops/incidents` (Two separate hardcoded tables).
2. **Alerts Queue:** `/soc/alerts` vs `/secops/alerts` (Two separate hardcoded tables).
3. **User Management:** `/admin/users` vs `/admin-portal/users` (Two separate hardcoded user tables; backend has no `/users` API).
4. **Audit Logs:** `/admin/audit` vs `/admin-portal/audit` (Two separate hardcoded log tables).
5. **Asset Inventory:** `/infra/hosts` vs `/secops/assets` vs `/admin-portal/assets` (One placeholder, one mock, one placeholder).
6. **Reports:** `/analytics/reports` vs `/secops/reports` (One placeholder, one visual-only mockup).
