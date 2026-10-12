# FANOS AI — Safe, Phased UI Redesign Roadmap

**Date:** October 2026  
**Auditor / Architect:** Senior Frontend Architect & Cybersecurity SOC UX Specialist  
**Design Direction:** Modern professional Security Operations Center with Claude-inspired simplicity  

---

## 1. Guiding Product & Design Principles

1. **Restrained, Professional SOC Aesthetic:**
   - Deep charcoal/navy backgrounds (`#080f1c`, `#0c1527`, `#111d33`).
   - Restrained cyan as a functional accent, not as decorative neon glow.
   - Severity colors used with strict semantic discipline: Red (Critical), Orange (High), Amber (Medium), Cyan (Low/Info), Emerald (Operational).
   - Generous spacing, subtle borders (`rgba(255, 255, 255, 0.07)`), clean typography, and zero distracting animations.
2. **Absolute Data Truthfulness:**
   - Real security evidence is visually distinguished from model predictions, derived aggregates, and mock fixtures.
   - When an endpoint is unreachable, an explicit error banner with retry controls is shown; mock data is **never silently substituted**.
   - If a metric is unavailable, it is displayed as `—` (unavailable), not as `0` or a fabricated percentage.
3. **Coherent, Unified Experience:**
   - Consolidate the 3 fragmented workspaces (`Customer SOC`, `SecOps`, `Admin Portal`) into a single, cohesive, role-gated SOC platform.
   - Eliminate dead-end placeholder pages and redundant duplicate routes.

---

## 2. Phased Implementation Roadmap

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PHASED EXECUTION TIMELINE                            │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 0: Read-Only Audit & Verification Baseline        [COMPLETED]    │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 1: Baseline Stabilization & Trust Fixes           [NEXT]         │
│          - Real JWT Login, Remove Client Passwords                     │
│          - Remove Silent Fallbacks in useDashboard                     │
│          - Fix Sensor Route Mount & Base URLs                          │
│          - Disaggregate System Health Indicators                       │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 2: Design System Tokens & Application Shell                      │
│          - Claude-inspired dark design tokens & typography             │
│          - Reusable component library (Tables, Badges, Drawers, Modals)│
│          - Unified navigation shell                                    │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 3: Page-by-Page Redesign Slices                                  │
│          - Slice 1: Overview Dashboard (Truthful KPIs & Event Stream)  │
│          - Slice 2: Detection & Suricata Live Log View                 │
│          - Slice 3: Alerts & Incidents with DB Persistence             │
│          - Slice 4: AI Intelligence (Accurate 70/25 Feature Specs)     │
│          - Slice 5: Infrastructure & Sensor Lifecycle Control          │
│          - Slice 6: Route Consolidation & Placeholder Pruning          │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 4: Interactive Verification & Accessibility                      │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 5: Regression Testing & Acceptance Validation                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Phase 1 — Establish Safe Baseline & Fix Critical Trust Issues

*Objective:* Fix critical security flaws and eliminate misleading indicators before any visual restyling.

### Step 1.1: Authentication & Authorization Repair
- **Action:** Replace client-side authentication in [`LoginPage.tsx`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/pages/LoginPage.tsx).
- **Implementation:**
  - Remove `const DEMO_USERS` and plaintext passwords from the frontend bundle.
  - Submit credentials via Axios to `POST /api/v1/auth/login`.
  - Store the real server-signed JWT in `localStorage` under `fanos_token`.
  - Update [`RequireAuth.tsx`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/components/layout/RequireAuth.tsx) to parse token claims (role, expiration) and reject expired/invalid tokens.
  - Verify that newly registered users from `RegisterPage.tsx` can log in immediately.

### Step 1.2: Remove Silent Error Swallowing
- **Action:** Eliminate `withFallback()` in [`useDashboard.ts`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/hooks/useDashboard.ts).
- **Implementation:**
  - Standardize all React Query hooks to return `{ data, isLoading, isError, error, refetch }`.
  - Implement an accessible `<ErrorBanner />` component allowing the user to retry failed requests.
  - Stop returning fake `{ status: 'ONLINE' }` on sensor lifecycle failures in [`api.ts`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/lib/api.ts).

### Step 1.3: Fix API Base URLs and Sensor Routing
- **Action:** Remove hardcoded `http://localhost:8000` URLs.
- **Implementation:**
  - Update `RegisterPage.tsx` and `SmsDashboard.tsx` to use `/api/v1/...` relative paths.
  - Mount `sensors.router` in [`backend/app/api/v1/__init__.py`](file:///d:/fanos%20ai/-FANOS-AI/backend/app/api/v1/__init__.py).
  - Align sensor control paths between frontend (`/sensors`) and backend.

### Step 1.4: Disaggregate Misleading "All Systems Operational" Badge
- **Action:** Break the monolithic `/health` check into distinct component health indicators:
  - Backend API (Online/Offline)
  - PostgreSQL Database (Connected/Disconnected)
  - Suricata Collector Daemon (Receiving Events / Inactive)
  - Machine Learning Engine (Model Loaded / Idle)

---

## 4. Phase 2 — Design System & Application Shell

*Objective:* Establish design tokens and reusable UI primitives following Claude-inspired simplicity.

### Design Tokens
```css
:root {
  /* Surfaces */
  --bg-canvas: #080f1c;
  --bg-surface: #0c1527;
  --bg-surface-elevated: #111d33;
  --bg-surface-hover: rgba(255, 255, 255, 0.03);

  /* Borders */
  --border-subtle: rgba(255, 255, 255, 0.06);
  --border-default: rgba(255, 255, 255, 0.10);
  --border-accent: rgba(0, 200, 255, 0.25);

  /* Typography */
  --text-primary: #f0f4f8;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --text-dim: #475569;

  /* Semantics */
  --critical: #ef4444;
  --high: #f97316;
  --medium: #f59e0b;
  --low: #00c8ff;
  --operational: #00e5a0;
}
```

### Core Reusable Components to Build
1. `<SeverityBadge severity="CRITICAL" />` — Restrained pill badge with no glowing borders.
2. `<TruthfulDataTable />` — Dense but readable table with source indicators, empty states, and pagination.
3. `<EventDetailDrawer />` — Slide-out drawer displaying full raw JSON telemetry, timestamps, and model predictions.
4. `<StatusIndicator source="suricata" status="live" lastSeen={...} />` — Truthful telemetry status pill.
5. `<GlobalCommandPalette />` — Real `⌘K` modal for search and navigation.

---

## 5. Phase 3 — Detailed Page Redesign Slices

### Slice 1: Overview Dashboard (First Implementation Slice)
- **Scope:** Redesign [`Dashboard.tsx`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/pages/Dashboard.tsx).
- **Features:**
  1. Truthful KPI cards (Real event counts; mark unaggregated change percentages as unavailable or calculate from DB).
  2. Dynamic Threat Activity time-series connected to real SQL time buckets.
  3. Real Live Security Events feed with click-to-view dynamic event details (replaces hardcoded LockBit modal).
  4. Working URI assessment tool with history drawer.
  5. Remove hardcoded MITRE, Threat Intel, and System Status mock panels until backed by real endpoints.
  6. Source-aware headers indicating whether data is derived from Suricata, ML inference, or database aggregates.

### Slice 2: Detection and Suricata Live View
- Wire [`SuricataPage.tsx`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/pages/secops/network/SuricataPage.tsx) to `GET /api/v1/events/live?sensor_source=suricata`.
- Clearly distinguish signature-based Suricata alerts (`action=ALERT/DROP`) from ML-based flow classifications (`fanos-ml-flow-experimental`).
- Add signature and IP search filters.

### Slice 3: Alerts and Incidents
- Migrate `incidents.py` from in-memory Python objects to the PostgreSQL `Incident` model.
- Enable analysts to update incident status (`Open` → `Investigating` → `Contained` → `Closed`) and persist changes.

### Slice 4: AI Intelligence Telemetry
- Update [`AIEngine.tsx`](file:///d:/fanos%20ai/-FANOS-AI/frontend/src/pages/ai/AIEngine.tsx) to reflect verified runtime specs:
  - Model Name: `16D_CHAMPION` (FANOS V3)
  - Features: 70 network flow features
  - Classes: 15 attack classes
  - Native Flow Schema: `SURICATA_FLOW_NATIVE_V1` (25 features)
  - Real measured inference latency from `ai_engine.get_status()`.

### Slice 5: Infrastructure & Sensor Node Control
- Connect sensor status cards to real daemon heartbeats.
- Ensure sensor lifecycle commands hit mounted `/api/v1/sensors` routes and report real execution statuses.

### Slice 6: Consolidation & Pruning
- Remove or hide the 36 dead-end placeholder routes from navigation menus.
- Merge duplicate screens across the 3 layouts into single authoritative views.

---

## 6. Acceptance Criteria for Phase Completion

Every implementation slice must meet the following criteria before moving to the next slice:
1. **Zero Mock Injection:** Disconnecting the backend displays an error banner; mock data is never substituted.
2. **Real Data Verification:** Every metric is traced to an active database query or API response.
3. **No Unhandled Actions:** Every button either performs a verified action or is disabled with a clear explanation.
4. **Test & Build Verification:** TypeScript builds cleanly without errors; backend test suite passes.
5. **Reversibility:** Changes are committed in small, discrete Git commits that can be reverted independently.
