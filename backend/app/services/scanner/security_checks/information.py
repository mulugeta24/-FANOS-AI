"""
Information Disclosure & Server Exposure Assessment Engine
Audits server banners, framework headers, stack traces, directory listings, and sensitive file exposures.
"""
import re
import uuid
import httpx
from urllib.parse import urljoin

SENSITIVE_PATHS = [
    {'path': '/info.php', 'sig': r'phpinfo|PHP Version|Zend Engine|PHP Extension', 'name': 'Debug / Development Endpoint Exposed: /info.php', 'severity': 'High', 'category': 'Deployment / Configuration', 'cwe': 'CWE-94: Improper Control of Generation of Code', 'cwe_url': 'https://cwe.mitre.org/data/definitions/94.html'},
    {'path': '/phpinfo.php', 'sig': r'phpinfo|PHP Version|Zend Engine', 'name': 'PHP Info Diagnostic Script Exposed: /phpinfo.php', 'severity': 'High', 'category': 'Deployment / Configuration', 'cwe': 'CWE-94: Improper Control of Generation of Code', 'cwe_url': 'https://cwe.mitre.org/data/definitions/94.html'},
    {'path': '/.env', 'sig': r'DB_PASSWORD|APP_KEY|SECRET_KEY|DATABASE_URL|AWS_SECRET', 'name': 'Exposed Environment Secrets File (.env)', 'severity': 'Critical', 'category': 'Information Exposure', 'cwe': 'CWE-552: Files or Directories Accessible to External Parties', 'cwe_url': 'https://cwe.mitre.org/data/definitions/552.html'},
    {'path': '/.git/HEAD', 'sig': r'ref: refs/heads/', 'name': 'Exposed Git Repository Metadata (/.git/HEAD)', 'severity': 'High', 'category': 'Information Exposure', 'cwe': 'CWE-552: Files or Directories Accessible to External Parties', 'cwe_url': 'https://cwe.mitre.org/data/definitions/552.html'},
    {'path': '/server-status', 'sig': r'Apache Server Status|Server Version', 'name': 'Exposed Web Server Status (/server-status)', 'severity': 'Medium', 'category': 'Information Exposure', 'cwe': 'CWE-200: Information Exposure', 'cwe_url': 'https://cwe.mitre.org/data/definitions/200.html'},
    {'path': '/robots.txt', 'sig': r'User-agent:', 'name': 'Robots.txt Analysis', 'severity': 'Informational', 'category': 'Information Exposure', 'cwe': 'CWE-200: Information Exposure', 'cwe_url': 'https://cwe.mitre.org/data/definitions/200.html'},
]

def check_information_exposure(target_url: str, headers: dict, html_content: str, allow_probes: bool = True) -> list[dict]:
    """
    Evaluates HTTP responses for information leakage, internal IPs, emails, CRLF, and verifies common sensitive endpoints.
    """
    findings = []
    headers_lower = {k.lower(): v for k, v in headers.items()}

    # 1. Server Header Disclosure (Version Disclosure)
    server = headers_lower.get('server')
    if server:
        has_version = bool(re.search(r'\d+\.\d+', server))
        if has_version:
            findings.append({
                'id': f"FND-INFO-SERVER-{uuid.uuid4().hex[:8]}",
                'title': f"Web Server Version Disclosed: {server}",
                'severity': "Low",
                'confidence': "Confirmed",
                'category': "Information Exposure",
                'affected_asset': target_url,
                'affected_url': target_url,
                'http_method': "GET",
                'parameter': "Server",
                'description': f"The web server exposes its exact product and version number in the HTTP 'Server' header: '{server}'.",
                'impact': "Attackers can look up known CVEs for the specific version to stage targeted exploits against the unpatched server daemon.",
                'remediation': "Configure the web server to suppress or genericize the Server banner (e.g. 'ServerTokens Prod' in Apache or 'server_tokens off;' in Nginx).",
                'references': [
                    {"title": "CWE-200: Exposure of Sensitive Information to an Unauthorized Actor", "url": "https://cwe.mitre.org/data/definitions/200.html"}
                ],
                'evidence': {
                    'header': 'Server',
                    'observed_value': server
                },
                'scanner_module': "InformationExposureCheck"
            })

    # 2. X-Powered-By Header Disclosure
    powered_by = headers_lower.get('x-powered-by')
    if powered_by:
        findings.append({
            'id': f"FND-INFO-POWERED-{uuid.uuid4().hex[:8]}",
            'title': f"Backend Technology Disclosed: X-Powered-By: {powered_by}",
            'severity': "Low",
            'confidence': "Confirmed",
            'category': "Information Exposure",
            'affected_asset': target_url,
            'affected_url': target_url,
            'http_method': "GET",
            'parameter': "X-Powered-By",
            'description': f"The application announces its underlying programming language or runtime: '{powered_by}'.",
            'impact': "Reveals application framework stack, narrowing attacker reconnaissance for specialized framework injection vectors.",
            'remediation': "Disable the X-Powered-By header in application settings (e.g. app.disable('x-powered-by') in Express or 'expose_php = Off' in php.ini).",
            'references': [
                {"title": "CWE-200: Information Exposure", "url": "https://cwe.mitre.org/data/definitions/200.html"}
            ],
            'evidence': {
                'header': 'X-Powered-By',
                'observed_value': powered_by
            },
            'scanner_module': "InformationExposureCheck"
        })

    # 3. Stack Trace / Internal Debugger Disclosures in Body
    if html_content:
        error_patterns = [
            (r'Traceback \(most recent call last\):', 'Python / Django Stack Trace'),
            (r'Fatal error:.*in .*\.php on line \d+', 'PHP Fatal Error Disclosure'),
            (r'Microsoft VBScript runtime error', 'Classic ASP / VBScript Runtime Error'),
            (r'org\.apache\.catalina\.core\.StandardWrapper', 'Tomcat / Java Servlet Exception Trace'),
            (r'SQLSTATE\[[0-9A-Z]+\]', 'Database SQL Error Disclosure'),
        ]
        for pattern, desc in error_patterns:
            if re.search(pattern, html_content, re.IGNORECASE):
                findings.append({
                    'id': f"FND-INFO-TRACE-{uuid.uuid4().hex[:8]}",
                    'title': f"Application Debug Error / Stack Trace Disclosed ({desc})",
                    'severity': "Medium",
                    'confidence': "High confidence",
                    'category': "Information Exposure",
                    'affected_asset': target_url,
                    'affected_url': target_url,
                    'http_method': "GET",
                    'parameter': "Response Body",
                    'description': f"The application response contained diagnostic debug indicators matching {desc}.",
                    'impact': "Internal system file paths, database structure, and source code excerpts are revealed to unauthenticated users.",
                    'remediation': "Disable debug mode in production environment settings and configure generic custom error pages (e.g. HTTP 500 handler).",
                    'references': [
                        {"title": "CWE-209: Generation of Error Message Containing Sensitive Information", "url": "https://cwe.mitre.org/data/definitions/209.html"}
                    ],
                    'evidence': {
                        'matched_pattern': desc,
                        'excerpt': html_content[:200].strip()
                    },
                    'scanner_module': "InformationExposureCheck"
                })
                break

        # 4. Internal IP Address Disclosure (RFC 1918 in HTML body)
        internal_ip_regex = r'\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b'
        discovered_internal_ips = list(set(re.findall(internal_ip_regex, html_content)))
        # Filter out 127.0.0.1 or standard netmasks
        discovered_internal_ips = [ip for ip in discovered_internal_ips if not ip.endswith('.0') and not ip.endswith('.255')]
        if discovered_internal_ips:
            findings.append({
                'id': f"FND-INFO-IP-{uuid.uuid4().hex[:8]}",
                'title': "Internal IP Address Disclosed in Response Body",
                'severity': "Low",
                'confidence': "Confirmed",
                'category': "Information Exposure",
                'affected_asset': target_url,
                'affected_url': target_url,
                'http_method': "GET",
                'parameter': "Response Body",
                'description': f"The application response body contains internal / private IP address(es): {', '.join(discovered_internal_ips[:6])}.",
                'impact': "Internal network topology is revealed to external users, aiding SSRF attacks and internal network reconnaissance.",
                'remediation': "Remove internal IPs from all user-facing responses. Use hostnames instead of IPs in application-generated content. Configure reverse proxies to strip internal routing headers.",
                'references': [
                    {"title": "CWE-200: Exposure of Sensitive Information", "url": "https://cwe.mitre.org/data/definitions/200.html"}
                ],
                'evidence': {
                    'disclosed_ips': discovered_internal_ips[:10],
                    'count': len(discovered_internal_ips)
                },
                'scanner_module': "InformationExposureCheck"
            })

        # 5. Potential CRLF / HTTP Response Splitting Indicator
        crlf_matches = re.findall(r'(?:%0d%0a|\r\n|\\r\\n)', html_content[:5000])
        if len(crlf_matches) > 1:
            findings.append({
                'id': f"FND-CRLF-{uuid.uuid4().hex[:8]}",
                'title': "Potential CRLF / HTTP Response Splitting Indicator in Page",
                'severity': "Low",
                'confidence': "Medium confidence",
                'category': "CRLF Injection",
                'affected_asset': target_url,
                'affected_url': target_url,
                'http_method': "GET",
                'parameter': "Response HTML",
                'description': "The page HTML contains encoded CRLF sequences (\\r\\n / %0d%0a) which are characteristic of HTTP Response Splitting payloads.",
                'impact': "If user input containing CRLF sequences is reflected into HTTP response headers without sanitisation, an attacker can inject arbitrary headers or split the HTTP response.",
                'remediation': "Sanitise all user-supplied data before reflecting it into HTTP headers. Strip or encode CR (\\r) and LF (\\n) characters.",
                'references': [
                    {"title": "CWE-113: Improper Neutralization of CRLF Sequences in HTTP Headers", "url": "https://cwe.mitre.org/data/definitions/113.html"}
                ],
                'evidence': {
                    'indicator': 'Encoded CRLF markers observed in markup payload'
                },
                'scanner_module': "InformationExposureCheck"
            })

        # 6. Email Address Exposure in Body
        email_regex = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b'
        emails = list(set(re.findall(email_regex, html_content)))
        # Filter out sample/fake emails
        ignore_email_domains = ('example.com', 'w3.org', 'schema.org', 'domain.com', 'yourcompany.com')
        valid_emails = [e for e in emails if not any(e.lower().endswith(d) for d in ignore_email_domains)]
        if valid_emails:
            findings.append({
                'id': f"FND-INFO-EMAIL-{uuid.uuid4().hex[:8]}",
                'title': f"Email Address(es) Disclosed in Page ({len(valid_emails)} found)",
                'severity': "Informational",
                'confidence': "Confirmed",
                'category': "Information Exposure",
                'affected_asset': target_url,
                'affected_url': target_url,
                'http_method': "GET",
                'parameter': "Response Body",
                'description': f"The page exposes {len(valid_emails)} email address(es) in its HTML content: {', '.join(valid_emails[:4])}.",
                'impact': "Exposed email addresses enable spear-phishing campaigns, username enumeration for credential-stuffing attacks, and spam targeting.",
                'remediation': "Remove email addresses from public-facing pages where not necessary. Use contact forms instead of mailto: links. Obfuscate emails that must remain visible.",
                'references': [
                    {"title": "CWE-200: Exposure of Sensitive Information", "url": "https://cwe.mitre.org/data/definitions/200.html"}
                ],
                'evidence': {
                    'discovered_emails': valid_emails[:8],
                    'count': len(valid_emails)
                },
                'scanner_module': "InformationExposureCheck"
            })

    # 7. Safe Sensitive Path Verification (Probe common debug/config indicators if permitted)
    if allow_probes:
        headers_probe = {'User-Agent': 'Fanos-SecurityScanner/2.4'}
        try:
            with httpx.Client(headers=headers_probe, timeout=4.0, follow_redirects=False, verify=False) as client:
                for item in SENSITIVE_PATHS:
                    probe_url = urljoin(target_url, item['path'])
                    try:
                        r = client.get(probe_url)
                        if r.status_code == 200 and re.search(item['sig'], r.text, re.IGNORECASE):
                            category = item.get('category', 'Information Exposure')
                            cwe_title = item.get('cwe', 'CWE-552: Files or Directories Accessible to External Parties')
                            cwe_url = item.get('cwe_url', 'https://cwe.mitre.org/data/definitions/552.html')

                            findings.append({
                                'id': f"FND-INFO-PATH-{uuid.uuid4().hex[:8]}",
                                'title': item['name'],
                                'severity': item['severity'],
                                'confidence': "Confirmed",
                                'category': category,
                                'affected_asset': target_url,
                                'affected_url': probe_url,
                                'http_method': "GET",
                                'parameter': item['path'],
                                'description': f"The debug/development endpoint '{item['path']}' returned HTTP 200, indicating it is publicly accessible in what appears to be a production environment.",
                                'impact': "Debug endpoints often expose environment variables, database credentials, internal IP addresses, stack traces, and application internals.",
                                'remediation': "Disable all debug, development, and diagnostic endpoints in production. Use environment flags (DEBUG=False) and remove development middleware.",
                                'references': [
                                    {"title": cwe_title, "url": cwe_url}
                                ],
                                'evidence': {
                                    'url': probe_url,
                                    'status_code': 200,
                                    'snippet': f"Matched signature: {item['sig']}"
                                },
                                'scanner_module': "InformationExposureCheck"
                            })
                    except Exception:
                        pass
        except Exception:
            pass

    return findings
