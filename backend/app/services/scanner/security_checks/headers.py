"""
HTTP Security Headers Assessment Engine
Evaluates CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy.
"""
import uuid

def check_security_headers(target_url: str, headers: dict) -> list[dict]:
    """
    Evaluates HTTP response headers against modern security baselines.
    """
    findings = []
    headers_lower = {k.lower(): v for k, v in headers.items()}
    is_https = target_url.lower().startswith('https://')

    # 1. Content-Security-Policy (CSP)
    csp = headers_lower.get('content-security-policy')
    if not csp:
        findings.append({
            'id': f"FND-CSP-{uuid.uuid4().hex[:8]}",
            'title': "Missing Content-Security-Policy (CSP) Header",
            'severity': "Medium",
            'confidence': "Confirmed",
            'category': "Security Headers",
            'affected_asset': target_url,
            'affected_url': target_url,
            'http_method': "GET",
            'parameter': "Content-Security-Policy",
            'description': "The web application does not implement a Content-Security-Policy header. CSP helps restrict the resources (such as JavaScript, CSS, Images) that the browser is allowed to load for a given page.",
            'impact': "Without a strong CSP, the application is more susceptible to Cross-Site Scripting (XSS), clickjacking, and code injection attacks, as any injected script can execute without constraint.",
            'remediation': "Implement a robust Content-Security-Policy header restricting script execution to authorized domains and cryptographic nonces. Example:\nContent-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none';",
            'references': [
                {"title": "OWASP Content Security Policy Cheat Sheet", "url": "https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html"},
                {"title": "CWE-1021: Improper Restriction of Rendered UI Layers", "url": "https://cwe.mitre.org/data/definitions/1021.html"}
            ],
            'evidence': {
                'header': 'Content-Security-Policy',
                'observed_value': None,
                'status': 'Header not present in HTTP response'
            },
            'scanner_module': "SecurityHeadersCheck"
        })
    else:
        # Check for unsafe directives in existing CSP
        unsafe_directives = []
        if "'unsafe-inline'" in csp:
            unsafe_directives.append("'unsafe-inline'")
        if "'unsafe-eval'" in csp:
            unsafe_directives.append("'unsafe-eval'")
        if "* " in csp or "default-src *" in csp:
            unsafe_directives.append("wildcard (*)")

        if unsafe_directives:
            findings.append({
                'id': f"FND-CSP-UNSAFE-{uuid.uuid4().hex[:8]}",
                'title': "Weak Content-Security-Policy: Unsafe Directives Permitted",
                'severity': "Low",
                'confidence': "High confidence",
                'category': "Security Headers",
                'affected_asset': target_url,
                'affected_url': target_url,
                'http_method': "GET",
                'parameter': "Content-Security-Policy",
                'description': f"The Content-Security-Policy header was detected but includes permissive directives: {', '.join(unsafe_directives)}.",
                'impact': "Directives like 'unsafe-inline' and 'unsafe-eval' neutralize primary XSS mitigations by allowing untrusted inline JavaScript and eval() calls to execute.",
                'remediation': "Refactor inline scripts into external files or protect them using cryptographic hashes or random per-request nonces ('nonce-randomValue'). Avoid 'unsafe-inline' and 'unsafe-eval'.",
                'references': [
                    {"title": "MDN CSP: script-src", "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src"}
                ],
                'evidence': {
                    'header': 'Content-Security-Policy',
                    'observed_value': csp[:300] + ('...' if len(csp) > 300 else ''),
                    'flagged_directives': unsafe_directives
                },
                'scanner_module': "SecurityHeadersCheck"
            })

    # 2. HTTP Strict Transport Security (HSTS)
    if is_https:
        hsts = headers_lower.get('strict-transport-security')
        if not hsts:
            findings.append({
                'id': f"FND-HSTS-{uuid.uuid4().hex[:8]}",
                'title': "Missing HTTP Strict-Transport-Security (HSTS) Header",
                'severity': "Medium",
                'confidence': "Confirmed",
                'category': "Security Headers",
                'affected_asset': target_url,
                'affected_url': target_url,
                'http_method': "GET",
                'parameter': "Strict-Transport-Security",
                'description': "The web server serves content over HTTPS but does not announce the Strict-Transport-Security header to mandate secure connections.",
                'impact': "Users connecting via insecure Wi-Fi or compromised gateways can be downgraded to unencrypted HTTP via SSL-stripping Man-in-the-Middle (MitM) attacks.",
                'remediation': "Enable HSTS on the web server with a minimum duration of one year (31,536,000 seconds), including subdomains:\nStrict-Transport-Security: max-age=31536000; includeSubDomains; preload",
                'references': [
                    {"title": "RFC 6797: HTTP Strict Transport Security (HSTS)", "url": "https://datatracker.ietf.org/doc/html/rfc6797"},
                    {"title": "OWASP HSTS Cheat Sheet", "url": "https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Strict_Transport_Security_Cheat_Sheet.html"}
                ],
                'evidence': {
                    'header': 'Strict-Transport-Security',
                    'observed_value': None,
                    'status': 'Header not present on HTTPS endpoint'
                },
                'scanner_module': "SecurityHeadersCheck"
            })

    # 3. X-Content-Type-Options
    xcto = headers_lower.get('x-content-type-options')
    if not xcto or 'nosniff' not in xcto.lower():
        findings.append({
            'id': f"FND-XCTO-{uuid.uuid4().hex[:8]}",
            'title': "Missing X-Content-Type-Options: nosniff Header",
            'severity': "Low",
            'confidence': "Confirmed",
            'category': "Security Headers",
            'affected_asset': target_url,
            'affected_url': target_url,
            'http_method': "GET",
            'parameter': "X-Content-Type-Options",
            'description': "The X-Content-Type-Options header is either missing or does not specify 'nosniff'.",
            'impact': "Browsers may attempt MIME-type sniffing on files served by the server, potentially executing non-executable uploads (e.g. image files disguised as HTML/JS) as code.",
            'remediation': "Configure the web server or reverse proxy to include the header:\nX-Content-Type-Options: nosniff",
            'references': [
                {"title": "MDN X-Content-Type-Options", "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options"}
            ],
            'evidence': {
                'header': 'X-Content-Type-Options',
                'observed_value': xcto,
                'status': 'Missing nosniff attribute'
            },
            'scanner_module': "SecurityHeadersCheck"
        })

    # 4. X-Frame-Options (Clickjacking Protection)
    xfo = headers_lower.get('x-frame-options')
    if not xfo and (not csp or 'frame-ancestors' not in csp):
        findings.append({
            'id': f"FND-XFO-{uuid.uuid4().hex[:8]}",
            'title': "Missing Clickjacking Protection (X-Frame-Options)",
            'severity': "Medium",
            'confidence': "Confirmed",
            'category': "Security Headers",
            'affected_asset': target_url,
            'affected_url': target_url,
            'http_method': "GET",
            'parameter': "X-Frame-Options",
            'description': "Neither an X-Frame-Options header nor a CSP frame-ancestors directive was detected to prevent the site from being rendered within an iframe.",
            'impact': "Adversaries can embed the application inside an invisible or disguised iframe on a malicious website to trick users into unintended clicks (Clickjacking / UI Redressing).",
            'remediation': "Send an X-Frame-Options header with value 'DENY' or 'SAMEORIGIN', or use CSP 'frame-ancestors':\nX-Frame-Options: SAMEORIGIN",
            'references': [
                {"title": "OWASP Clickjacking Defense Cheat Sheet", "url": "https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html"}
            ],
            'evidence': {
                'header': 'X-Frame-Options',
                'observed_value': None,
                'status': 'Missing X-Frame-Options and CSP frame-ancestors'
            },
            'scanner_module': "SecurityHeadersCheck"
        })

    # 5. Referrer-Policy
    ref_pol = headers_lower.get('referrer-policy')
    if not ref_pol or 'unsafe-url' in ref_pol.lower():
        findings.append({
            'id': f"FND-REFPOL-{uuid.uuid4().hex[:8]}",
            'title': "Missing or Permissive Referrer-Policy Header",
            'severity': "Low",
            'confidence': "Confirmed",
            'category': "Security Headers",
            'affected_asset': target_url,
            'affected_url': target_url,
            'http_method': "GET",
            'parameter': "Referrer-Policy",
            'description': "The application does not set a restrictive Referrer-Policy header.",
            'impact': "Sensitive URL query parameters (e.g. token IDs, email addresses, password reset tokens) may leak to external third-party domains via HTTP Referer headers.",
            'remediation': "Set a restrictive Referrer-Policy header such as 'strict-origin-when-cross-origin' or 'no-referrer':\nReferrer-Policy: strict-origin-when-cross-origin",
            'references': [
                {"title": "MDN Referrer-Policy", "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy"}
            ],
            'evidence': {
                'header': 'Referrer-Policy',
                'observed_value': ref_pol,
                'status': 'Missing or set to unsafe-url'
            },
            'scanner_module': "SecurityHeadersCheck"
        })

    # 6. Permissions-Policy
    perm_pol = headers_lower.get('permissions-policy') or headers_lower.get('feature-policy')
    if not perm_pol:
        findings.append({
            'id': f"FND-PERMPOL-{uuid.uuid4().hex[:8]}",
            'title': "Missing Permissions-Policy Header",
            'severity': "Informational",
            'confidence': "Confirmed",
            'category': "Security Headers",
            'affected_asset': target_url,
            'affected_url': target_url,
            'http_method': "GET",
            'parameter': "Permissions-Policy",
            'description': "The Permissions-Policy header allows web developers to selectively enable, disable, and modify the behavior of certain browser features and APIs (camera, microphone, geolocation).",
            'impact': "Without explicit permissions policy, embedded third-party scripts could request or utilize sensitive browser hardware capabilities.",
            'remediation': "Define a modern Permissions-Policy header explicitly disabling unused hardware APIs. Example:\nPermissions-Policy: camera=(), microphone=(), geolocation=()",
            'references': [
                {"title": "W3C Permissions Policy Specification", "url": "https://www.w3.org/TR/permissions-policy-1/"}
            ],
            'evidence': {
                'header': 'Permissions-Policy',
                'observed_value': None,
                'status': 'Header not present'
            },
            'scanner_module': "SecurityHeadersCheck"
        })

    # 7. Rate Limiting Headers
    has_rate_limit = any(
        k.startswith('x-ratelimit-') or k.startswith('ratelimit-') or k in ('retry-after', 'cf-ray')
        for k in headers_lower.keys()
    )
    if not has_rate_limit:
        findings.append({
            'id': f"FND-RATELIMIT-{uuid.uuid4().hex[:8]}",
            'title': "No Rate Limiting Headers Detected",
            'severity': "Informational",
            'confidence': "Medium confidence",
            'category': "Authentication & Abuse Prevention",
            'affected_asset': target_url,
            'affected_url': target_url,
            'http_method': "GET",
            'parameter': "Rate-Limiting Headers",
            'description': "The server response does not include any rate limiting headers (X-RateLimit-*, RateLimit-*, Retry-After).",
            'impact': "Without rate limiting, the application may be vulnerable to brute-force attacks on login endpoints, credential stuffing, and denial-of-service through resource exhaustion.",
            'remediation': "Implement rate limiting on all authentication and sensitive endpoints. Return standard RateLimit headers per RFC 6585 / IETF draft-polli-ratelimit-headers.",
            'references': [
                {"title": "OWASP Testing for Weak Lock Out Mechanism", "url": "https://owasp.org/www-project-web-security-testing-guide/v42/4-Web_Application_Security_Testing/04-Authentication_Testing/03-Testing_for_Weak_Lock_Out_Mechanism"}
            ],
            'evidence': {
                'checked_headers': ['X-RateLimit-Limit', 'RateLimit-Limit', 'Retry-After'],
                'status': 'No rate limiting headers found in response'
            },
            'scanner_module': "SecurityHeadersCheck"
        })

    return findings
