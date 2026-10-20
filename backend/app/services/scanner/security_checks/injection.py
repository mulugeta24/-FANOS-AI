"""
DAST Injection & Client-Side Attacks Assessment Engine
Audits URL endpoints and query parameters for SQL Injection signatures, Reflected XSS, and Open Redirects.
"""
import uuid
import re
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
import httpx

# Database Error Signatures for SQL Injection detection
SQL_ERRORS = [
    (r"You have an error in your SQL syntax", "MySQL Syntax Error"),
    (r"Warning: mysql_", "PHP MySQL Driver Warning"),
    (r"valid MySQL result", "MySQL Execution Error"),
    (r"PostgreSQL.*ERROR", "PostgreSQL Database Error"),
    (r"ERROR:\s+syntax error at or near", "PostgreSQL Syntax Error"),
    (r"Driver.*SQL[\-_ ]*Server", "Microsoft SQL Server Error"),
    (r"OLE DB.*SQL Server", "SQL Server OLE DB Error"),
    (r"Unclosed quotation mark before the character string", "MSSQL Unclosed Quote"),
    (r"ORA-[0-9]{4,5}", "Oracle Database Error"),
    (r"SQLite/JDBCDriver", "SQLite Driver Error"),
    (r"sqlite3\.OperationalError", "SQLite Operational Error"),
    (r"SQLSTATE\[[0-9A-Z]+\]", "Generic ANSI SQLSTATE Error"),
]

REDIRECT_PARAM_NAMES = {'redirect', 'url', 'next', 'return', 'dest', 'target', 'out', 'link', 'to', 'goto', 'r'}

def check_injection_and_xss(crawled_urls: list, allow_probes: bool = True) -> list[dict]:
    """
    Executes lightweight, non-destructive DAST security probes on discovered parameterized endpoints.
    """
    findings = []
    if not allow_probes or not crawled_urls:
        return findings

    # Find unique URLs with query parameters
    urls_with_params = []
    for item in crawled_urls:
        u = item.get('url') if isinstance(item, dict) else item
        if not u:
            continue
        parsed = urlparse(u)
        if parsed.query:
            urls_with_params.append(u)

    headers = {'User-Agent': 'Fanos-DASTScanner/2.4 (Security-Assessment)'}

    try:
        with httpx.Client(headers=headers, timeout=5.0, follow_redirects=False, verify=False) as client:
            # Audit max 8 unique parameterized endpoints for performance
            for target_url in urls_with_params[:8]:
                parsed = urlparse(target_url)
                params = parse_qs(parsed.query)

                for param_name, param_values in params.items():
                    orig_val = param_values[0] if param_values else ''

                    # 1. Open Redirect Check
                    if param_name.lower() in REDIRECT_PARAM_NAMES:
                        test_params = dict(params)
                        test_params[param_name] = 'https://example-security-test.com'
                        probe_query = urlencode(test_params, doseq=True)
                        probe_url = urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, probe_query, parsed.fragment))

                        try:
                            res = client.get(probe_url)
                            loc = res.headers.get('location', '')
                            if res.status_code in (301, 302, 303, 307, 308) and 'example-security-test.com' in loc:
                                findings.append({
                                    'id': f"FND-OPEN-REDIRECT-{uuid.uuid4().hex[:8]}",
                                    'title': f"Open Redirect Vulnerability in Parameter '{param_name}'",
                                    'severity': "Medium",
                                    'confidence': "Confirmed",
                                    'category': "Access Control & Redirection",
                                    'affected_asset': target_url,
                                    'affected_url': probe_url,
                                    'http_method': "GET",
                                    'parameter': param_name,
                                    'description': f"The parameter '{param_name}' redirects users to arbitrary external domains specified in the request without server-side destination validation.",
                                    'impact': "Attackers use open redirects to craft credible phishing campaigns, redirecting victims from trusted domains to phishing or credential-harvesting sites.",
                                    'remediation': "Implement an allowlist of permitted destination paths or validate destination URLs against allowed internal hostnames.",
                                    'references': [
                                        {"title": "CWE-601: URL Redirection to Untrusted Site ('Open Redirect')", "url": "https://cwe.mitre.org/data/definitions/601.html"},
                                        {"title": "OWASP Unvalidated Redirects and Forwards", "url": "https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html"}
                                    ],
                                    'evidence': {
                                        'parameter': param_name,
                                        'redirect_location': loc,
                                        'status_code': res.status_code
                                    },
                                    'scanner_module': "OpenRedirectCheck"
                                })
                        except Exception:
                            pass

                    # 2. SQL Injection Error Probe
                    sqli_probe_val = f"{orig_val}'\""
                    test_params = dict(params)
                    test_params[param_name] = sqli_probe_val
                    probe_query = urlencode(test_params, doseq=True)
                    sqli_url = urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, probe_query, parsed.fragment))

                    try:
                        res = client.get(sqli_url)
                        body = res.text
                        matched_error = None
                        for pattern, db_desc in SQL_ERRORS:
                            if re.search(pattern, body, re.IGNORECASE):
                                matched_error = db_desc
                                break

                        if matched_error:
                            findings.append({
                                'id': f"FND-SQLI-{uuid.uuid4().hex[:8]}",
                                'title': f"Potential SQL Injection in Parameter '{param_name}' ({matched_error})",
                                'severity': "Critical",
                                'confidence': "High confidence",
                                'category': "Injection Attacks",
                                'affected_asset': target_url,
                                'affected_url': sqli_url,
                                'http_method': "GET",
                                'parameter': param_name,
                                'description': f"Submitting syntax probe characters into parameter '{param_name}' triggered a database syntax error ({matched_error}).",
                                'impact': "Allows attackers to bypass authentication, read or corrupt sensitive database tables, or potentially execute commands on the underlying host.",
                                'remediation': "Use parameterized prepared statements (e.g. PDO, PreparedStatement) for all database queries. Never concatenate untrusted user input directly into SQL strings.",
                                'references': [
                                    {"title": "CWE-89: Improper Neutralization of Special Elements used in an SQL Command ('SQL Injection')", "url": "https://cwe.mitre.org/data/definitions/89.html"},
                                    {"title": "OWASP SQL Injection Prevention Cheat Sheet", "url": "https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html"}
                                ],
                                'evidence': {
                                    'parameter': param_name,
                                    'detected_db_error': matched_error,
                                    'payload': sqli_probe_val
                                },
                                'scanner_module': "SQLInjectionCheck"
                            })
                    except Exception:
                        pass

                    # 3. Reflected Cross-Site Scripting (XSS) Canary Probe
                    canary = f"fanos_xss_{uuid.uuid4().hex[:6]}"
                    test_params = dict(params)
                    test_params[param_name] = f"<{canary}>"
                    probe_query = urlencode(test_params, doseq=True)
                    xss_url = urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, probe_query, parsed.fragment))

                    try:
                        res = client.get(xss_url)
                        # Check if raw unescaped tag is reflected in body
                        if f"<{canary}>" in res.text:
                            findings.append({
                                'id': f"FND-XSS-{uuid.uuid4().hex[:8]}",
                                'title': f"Reflected Cross-Site Scripting (XSS) in Parameter '{param_name}'",
                                'severity': "High",
                                'confidence': "Confirmed",
                                'category': "Cross-Site Scripting (XSS)",
                                'affected_asset': target_url,
                                'affected_url': xss_url,
                                'http_method': "GET",
                                'parameter': param_name,
                                'description': f"User input supplied to parameter '{param_name}' was reflected directly into the HTML response body without context-aware output encoding.",
                                'impact': "Attackers can execute arbitrary JavaScript in the victim's browser, hijacking sessions, stealing cookies/credentials, or defacing content.",
                                'remediation': "Apply context-aware HTML entity encoding on all reflected user input. Utilize modern UI frameworks that automatically encode variables (e.g. React, Angular, Django templates).",
                                'references': [
                                    {"title": "CWE-79: Improper Neutralization of Input During Web Page Generation ('Cross-site Scripting')", "url": "https://cwe.mitre.org/data/definitions/79.html"},
                                    {"title": "OWASP XSS Prevention Cheat Sheet", "url": "https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html"}
                                ],
                                'evidence': {
                                    'parameter': param_name,
                                    'reflected_payload': f"<{canary}>"
                                },
                                'scanner_module': "XSSSecurityCheck"
                            })
                    except Exception:
                        pass

    except Exception:
        pass

    return findings
