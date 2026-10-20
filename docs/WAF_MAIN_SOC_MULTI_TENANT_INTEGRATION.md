# FANOS WAF — Main SOC Dashboard Multi-Tenant Integration Guide

## 1. Executive Summary

This document describes the multi-tenant domain selection architecture integrated into the main **FANOS AI SOC Dashboard** (`frontend/src/pages/secops/web/WAFPage.tsx`), unifying protected website management, policy scoping, and event analysis with the FANOS WAF backend API (`http://127.0.0.1:8001` via `/waf-api`).

---

## 2. Where the Domain Selector Appears

The reusable domain selector (`WAFDomainSelector.tsx`) is anchored in the top header control bar of the **Web Application Firewall (WAF)** page:
- **Location:** `frontend/src/pages/secops/web/WAFPage.tsx`
- **Visual Presentation:** Placed directly adjacent to the WAF status telemetry and "Sync Engine" action button.
- **Controls & Indicators:**
  - **Dropdown Selector:** Displays all active domains authorized for the authenticated user, formatted as `<domain_name> [<MODE>] (<ENV>)`, with an "All Protected Domains" option.
  - **Dynamic Status Pill:** Immediately reflects the enforcement state of the currently selected domain (`BLOCK` in crimson or `MONITOR` in amber).
  - **State Handling:** Built-in animated spinner during API loads, non-blocking empty state notification, and error container with a one-click "Retry" button.

---

## 3. How Domain Selection Affects WAF Tabs

Domain state is lifted to `WAFPage.tsx` (`selectedDomainId` and `selectedDomain`), ensuring state persistence across tab switches without resetting user context:

### A. Overview Tab (`WAFOverviewTab.tsx`)
- Displays real-time traffic KPI metrics and attack distribution.
- When an individual domain is selected, a **Scoped Domain View banner** highlights the targeted domain hostname, environment badge (`PRODUCTION`, `STAGING`, or `DEVELOPMENT`), and backend origin address.

### B. Policies Tab (`WAFPoliciesTab.tsx`)
- When a specific domain is selected, an interactive **Target Website Policy Context Card** appears at the top of the policies dashboard.
- Displays:
  - Domain Name and Target Environment.
  - Upstream Origin URL.
  - Verification & TLS status badges.
- **Per-Domain Mode Toggling:** Security operators can toggle the enforcement mode (`MONITOR` vs `BLOCK`) specifically for the selected domain with immediate backend persistence via `PATCH /api/v1/domains/{domain_id}` without altering global engine parameters.
- Global parameters (Body Size limits, URI lengths, Regex inspection rules, IP allowlists) remain fully manageable in the main policies view.

### C. Events Tab (`WAFEventsTab.tsx`)
- When a domain is selected, the events query automatically includes `?domain_id={selectedDomainId}`, executing **server-side SQL filtering** on the backend.
- Displays an active **Domain Filter Scope Banner** showing the targeted hostname and origin server.
- The Security Events table displays:
  - **Host Column:** Explicit domain hostname for the intercepted request.
  - **HTTP Column:** Actual HTTP status returned (`403` for blocks, `200` for allowed, etc.).
- When "All Protected Domains" is selected, events across all authorized domains are loaded with full pagination and severity filtering intact.

---

## 4. API Endpoints & Routing Architecture

All WAF communication from the main frontend (`http://localhost:3000`) flows through the Vite development proxy (`/waf-api`) to avoid CORS issues and hardcoded URLs:

| Main SOC Endpoint | Rewritten Backend Path | HTTP Method | Purpose |
|:---|:---|:---:|:---|
| `/waf-api/domains` | `/api/v1/domains` | `GET` | List domains authorized for the authenticated tenant. |
| `/waf-api/domains/{id}` | `/api/v1/domains/{id}` | `GET` | Fetch configuration details for a specific domain. |
| `/waf-api/domains/{id}` | `/api/v1/domains/{id}` | `PATCH` | Update domain enforcement mode, origin URL, or active status. |
| `/waf-api/events?domain_id={id}` | `/api/v1/events?domain_id={id}` | `GET` | Server-side filtered security events for a specific domain. |
| `/waf-api/stats/summary` | `/api/v1/stats/summary` | `GET` | Traffic inspection aggregates, mode status, and threat counts. |
| `/waf-api/settings` | `/api/v1/settings` | `GET` / `PATCH` | Global WAF engine settings and threshold policies. |

---

## 5. Backend Tenant Isolation & Authorization Boundaries

Strict multi-tenant security guarantees are enforced on the backend (`fanos-waf/backend/app/api/v1/domains.py` and `app/api/v1/events.py`):

1. **Identity-Derived Tenant Scoping:**
   - The user's tenant ID is extracted directly from the verified JWT claims (`current_user.tenant_id`) and database records.
   - For non-admin users, `effective_tenant` is strictly bound to `current_user.tenant_id`. Client-supplied `?tenant_id=...` query parameters from non-admins are ignored and cannot override authenticated identity.

2. **Cross-Tenant Mutation Denial:**
   - In `PATCH /api/v1/domains/{domain_id}`, `DELETE /api/v1/domains/{domain_id}`, and `POST /api/v1/domains/{domain_id}/verify`, the backend verifies that `domain.tenant_id == current_user.tenant_id`. If a tenant attempts to mutate a domain belonging to another tenant, the request is rejected with `HTTP 404 Not Found`.

3. **Cross-Tenant Event Read Denial:**
   - In `GET /api/v1/events` and `GET /api/v1/domains/{domain_id}/events`, the SQL query enforces `WHERE tenant_id = :effective_tenant`. Non-admin users cannot query or inspect events generated by another tenant's protected websites.

4. **Authentication Enforcement:**
   - All protected endpoints require a valid Bearer token. Unauthenticated requests are rejected with `HTTP 401 Unauthorized`.
   - Missing or expired tokens do not fall back to default or guest users.

---

## 6. Verification and Regression Test Results

- **Frontend Production Build:**
  - Command: `npm run build` in `frontend/`
  - Result: `✓ built in 10.09s` (0 TypeScript errors, 2,257 modules compiled).
- **Multi-Tenant Automated Tests:**
  - Command: `pytest -v tests/test_multitenant_integration.py` in `fanos-waf/backend/`
  - Result: 4 of 4 tests passed.
- **Full Backend Regression Suite:**
  - Command: `pytest -v` in `fanos-waf/backend/`
  - Result: **112 of 112 tests passed** (100% success rate, 0 regressions).

---

## 7. Remaining Limitations & Future Work

- **Granular Custom Rules per Domain:** The engine currently scopes enforcement modes (`MONITOR` vs `BLOCK`) and rate limits per domain. Full per-domain custom regex rule authoring is planned for Phase 13.
- **Dedicated WAF Dashboard Compatibility:** The dedicated WAF frontend on Port 3001 and the main SOC dashboard on Port 3000 share the identical `/api/v1` backend schemas and contracts, allowing seamless parallel operation.
