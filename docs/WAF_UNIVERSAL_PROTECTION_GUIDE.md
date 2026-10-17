# FANOS WAF — Universal Real-Website and Demo-Lab Protection Guide

## 1. Universal Protection Architecture

FANOS WAF provides deterministic web application firewall protection for two explicitly separated target classes:

1. **PRODUCTION WEBSITES**: Production customer applications requiring real DNS challenge verification, strict SSRF/private-network boundary protections, signed TLS termination, and verified reverse-proxy routing.
2. **AUTHORIZED DEMO / LAB WEBSITES**: Controlled vulnerability training applications (e.g., OWASP Juice Shop, OWASP WebGoat, and local test targets). Permits private/local addresses (`127.0.0.1`, `localhost`) only through an explicit administrator-controlled configuration.

```
       ┌────────────────────────┐
       │   Public Web Client    │
       └───────────┬────────────┘
                   │ HTTPS (Port 443 / 8002)
                   ▼
       ┌────────────────────────┐
       │     FANOS WAF Edge     │
       │ Reverse Proxy & Policy │
       └───────────┬────────────┘
                   │
         [Inspection & Scoring]
         ├─ SQL Injection (SQLi)
         ├─ Cross-Site Scripting (XSS)
         ├─ Path Traversal (LFI/RFI)
         ├─ Command Injection (CMDI)
         ├─ Request Smuggling Checks
         └─ Anomaly Risk Threshold (30-100)
                   │
        ┌──────────┴──────────┐
        │ Policy Decision     │
        ├─────────────────────┤
        │ BLOCK: HTTP 403     │ (Drops connection before reaching origin)
        │ MONITOR: Allow & Log│ (Forwards to upstream with audit log)
        └──────────┬──────────┘
                   │ Clean Traffic Only
                   ▼
 ┌──────────────────────────────────────┐
 │       Authorized Origin Server       │
 │  (Production App or Demo Lab Target) │
 └──────────────────────────────────────┘
```

---

## 2. Honest 6-Stage Protection Lifecycle

FANOS WAF enforces an honest protection model: a domain is **never** displayed as `PROTECTION_ACTIVE` merely because it was inserted into the database. Every stage must succeed sequentially:

| Stage # | Stage Name | Verification Condition |
| :--- | :--- | :--- |
| **1** | `DOMAIN_REGISTERED` | Target FQDN, upstream origin, environment, and tenant mapped in database. |
| **2** | `OWNERSHIP_VERIFIED` | Domain owner has configured the DNS TXT challenge token, verified via DNS-over-HTTPS. (Demo targets use local verification). |
| **3** | `TLS_READY` | Valid TLS certificate provisioned for domain (or lab self-signed certificate active). |
| **4** | `PROXY_ROUTE_CONFIGURED`| Host header mapping and reverse proxy router bound to upstream origin. |
| **5** | `END_TO_END_TRAFFIC_VERIFIED` | Real non-destructive HTTP probe successfully traversed proxy and received valid origin response. |
| **6** | `PROTECTION_ACTIVE` | Active defense armed. Clean traffic forwarded; malicious vectors dropped before origin. |

---

## 3. Real Website Protection & DNS Onboarding

### A. Reverse-Proxy Flow
- **Edge Entry**: Public HTTPS on port `8002` (or HTTP port `8001`).
- **Inspection Engine**: Evaluates method, path, headers, query parameters, and request body against deterministic rules.
- **Origin Forwarding**: Forwards clean traffic using proper `Host`, `X-Forwarded-For`, and `X-Forwarded-Proto` headers with configurable timeouts.

### B. DNS Ownership Verification
Domain owners are provided a DNS challenge token upon registration:
```text
Host / Name:  _fanos-waf-challenge.customer-domain.com
Record Type:  TXT
Value:        <verification_token>
TTL:          300 seconds
```
Verification is executed automatically using DNS-over-HTTPS (DoH). FANOS WAF never modifies customer DNS zones automatically.

### C. Traffic Routing DNS Configuration
Once verified, the domain owner points their public DNS to the FANOS WAF proxy:
```text
Type:  CNAME (or A Record)
Host:  secure.customer-domain.com
Value: waf.fanos-ai.com (or WAF Public IP)
```

### D. Private Origin Deployment
For customers whose applications reside in private VPCs or on-premises networks without a public IP:
- **Authenticated Outbound Connector / Reverse Tunnel**: The origin initiates an authenticated outbound TLS tunnel (e.g., Cloudflare Tunnel, AWS PrivateLink, or WireGuard connector) to the FANOS WAF edge.
- Direct internet exposure of the internal application server is **not** required.

### E. Anti-SSRF and Network Safety Guarantees
- Cloud metadata endpoints (`169.254.169.254`, AWS IMDSv2, GCP metadata) are strictly blocked across all target types.
- Production targets are forbidden from routing to unauthenticated private RFC1918 addresses unless an authenticated private connector is declared.

---

## 4. Controlled Demo Lab Protection

FANOS WAF provides dedicated support for training targets without weakening global protections:

### Built-in Lab Target Presets
1. **OWASP Juice Shop**:
   - Recommended Domain: `juiceshop.demo.local`
   - Default Origin: `http://127.0.0.1:3000`
   - Vulnerability Scope: Modern JavaScript/Angular vulnerabilities, SQLi, XSS, sensitive data exposure.
2. **OWASP WebGoat**:
   - Recommended Domain: `webgoat.demo.local`
   - Default Origin: `http://127.0.0.1:8080/WebGoat`
   - Vulnerability Scope: Classic Java J2EE vulnerabilities, SQLi, command injection, CSRF.
3. **FANOS Security Core Lab Target**:
   - Recommended Domain: `lab-origin.fanos.local`
   - Default Origin: `http://127.0.0.1:5000`

### Lab Mode Security Rules
- Local private addresses (`127.0.0.1`, `localhost`) are permitted **only** when `target_type: "demo_lab"` is explicitly set.
- Target validation is **never** globally disabled; lab permissions are strictly scoped per target.
- Synthetic events and simulation test cases are marked with `is_test: true` and action `TEST_BLOCK`/`TEST_MONITOR`.

---

## 5. Security Test Console & Attack Simulation

The Main SOC Dashboard includes a dedicated **Security Test Console** tab (`WAFTestConsoleTab`):

### Safe Test Suite Vectors
1. **Baseline Clean HTTP Probe**: Benign health check (`GET /?probe=waf_baseline`) expecting `ALLOW`.
2. **SQL Injection — Auth Bypass**: Tautology attack (`POST /login` with `username=admin' OR 1=1--`) expecting `BLOCK` (Risk 50).
3. **SQL Injection — UNION Data Exfiltration**: Schema extraction probe (`GET /catalog?id=1 UNION SELECT null, null, version()--`) expecting `BLOCK` (Risk 75).
4. **Cross-Site Scripting (XSS)**: Reflected script tag (`GET /search?q=<script>console.log('fanos_waf_diag')</script>`) expecting `BLOCK` (Risk 50).
5. **Path Traversal (LFI)**: Directory escape probe (`GET /download?file=../../etc/passwd`) expecting `BLOCK` (Risk 75).
6. **Command Injection**: Shell pipe probe (`GET /tools/ping?host=127.0.0.1; whoami`) expecting `BLOCK` (Risk 80).

### Production Safety Guard
- Testing a target marked as `production` is blocked by default.
- Operators must check the mandatory confirmation checkbox:
  > *"I am authorized by the domain owner to execute non-destructive security test vectors against this production origin."*

### SOC Alert Pipeline Integration
- Every simulation test case creates an actual security event logged in the database.
- Marked with `is_test: true` and `action: TEST_BLOCK` / `TEST_MONITOR`.
- Displayed with a distinct `[TEST]` badge in the Security Events table to prevent false alarms.

---

## 6. Ports and Deployment Configuration

| Service | Protocol | Port | Purpose |
| :--- | :--- | :--- | :--- |
| **FANOS AI SOC Main Frontend** | HTTP | `3000` | Unified SecOps & WAF management interface |
| **FANOS WAF API Service** | HTTP | `8001` | Management REST API, rule engine, domain service |
| **FANOS WAF HTTPS Proxy** | HTTPS | `8002` | Public reverse proxy endpoint terminating customer traffic |

### Environment Variables (`.env`)
```bash
# WAF Operating Mode
WAF_MODE=monitor                   # 'monitor' or 'block'
FAIL_MODE=fail_closed              # 'fail_closed' or 'fail_open'

# Security & Secrets
SECRET_KEY=YourProductionSecretKeyHereMin32Chars
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Rate Limiting & Proxy Thresholds
PROXY_RATE_LIMIT=120               # Requests per minute per client IP
MAX_BODY_SIZE_BYTES=1048576        # 1 MB body size limit
MAX_URI_LENGTH=2048                # Maximum URI characters
BLOCK_THRESHOLD=70                 # Anomaly score to drop request
MONITOR_THRESHOLD=30               # Anomaly score to log alert
```

---

## 7. Verification and Automated Testing

All 116 tests across the FANOS WAF backend pass with 0 failures:
```bash
cd fanos-waf/backend
.\\.venv\\Scripts\\pytest.exe -v
# Output: 116 passed, 2 warnings in 39.59s
```

Frontend compilation and production bundling:
```bash
cd frontend
npx tsc --noEmit   # Output: 0 errors
npm run build      # Output: vite build complete in 9.76s
```
