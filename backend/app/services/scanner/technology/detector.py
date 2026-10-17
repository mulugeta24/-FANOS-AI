"""
Web Technology Fingerprinting & Detection Engine
Identifies Web Servers, Application Frameworks, CMS, UI Libraries, and Languages.
"""
import re
from bs4 import BeautifulSoup
from scanner.models import add_scan_technology

TECH_RULES = [
    # Web Servers
    {'category': 'Web Server', 'name': 'Nginx', 'header': 'server', 'regex': r'nginx(?:/([\d.]+))?'},
    {'category': 'Web Server', 'name': 'Apache HTTP Server', 'header': 'server', 'regex': r'Apache(?:/([\d.]+))?'},
    {'category': 'Web Server', 'name': 'Cloudflare Server', 'header': 'server', 'regex': r'cloudflare'},
    {'category': 'Web Server', 'name': 'Microsoft IIS', 'header': 'server', 'regex': r'Microsoft-IIS(?:/([\d.]+))?'},
    {'category': 'Web Server', 'name': 'LiteSpeed', 'header': 'server', 'regex': r'LiteSpeed'},
    {'category': 'Web Server', 'name': 'Caddy', 'header': 'server', 'regex': r'Caddy'},
    {'category': 'Web Server', 'name': 'Gunicorn', 'header': 'server', 'regex': r'gunicorn(?:/([\d.]+))?'},
    {'category': 'Web Server', 'name': 'Werkzeug', 'header': 'server', 'regex': r'Werkzeug(?:/([\d.]+))?'},
    {'category': 'Web Server', 'name': 'Envoy', 'header': 'server', 'regex': r'envoy'},

    # Backend Frameworks & Languages
    {'category': 'Framework', 'name': 'Express.js', 'header': 'x-powered-by', 'regex': r'Express'},
    {'category': 'Framework', 'name': 'Next.js', 'header': 'x-powered-by', 'regex': r'Next\.js'},
    {'category': 'Framework', 'name': 'ASP.NET', 'header': 'x-powered-by', 'regex': r'ASP\.NET'},
    {'category': 'Framework', 'name': 'PHP', 'header': 'x-powered-by', 'regex': r'PHP(?:/([\d.]+))?'},
    {'category': 'Framework', 'name': 'Django', 'cookie': 'csrftoken', 'regex': r'.*'},
    {'category': 'Framework', 'name': 'Laravel', 'cookie': 'laravel_session', 'regex': r'.*'},
    {'category': 'Framework', 'name': 'Ruby on Rails', 'header': 'x-powered-by', 'regex': r'Phusion Passenger|Rails'},
    {'category': 'Language', 'name': 'PHP', 'cookie': 'PHPSESSID', 'regex': r'.*'},
    {'category': 'Language', 'name': 'Java', 'cookie': 'JSESSIONID', 'regex': r'.*'},
    {'category': 'Language', 'name': 'ASP.NET', 'cookie': 'ASP.NET_SessionId', 'regex': r'.*'},
    {'category': 'Framework', 'name': 'Node.js', 'cookie': 'connect.sid', 'regex': r'.*'},

    # CMS
    {'category': 'CMS', 'name': 'WordPress', 'meta': 'generator', 'regex': r'WordPress(?: ([\d.]+))?'},
    {'category': 'CMS', 'name': 'Drupal', 'meta': 'generator', 'regex': r'Drupal(?: ([\d.]+))?'},
    {'category': 'CMS', 'name': 'Joomla', 'meta': 'generator', 'regex': r'Joomla'},
    {'category': 'CMS', 'name': 'Shopify', 'meta': 'generator', 'regex': r'Shopify'},
    {'category': 'CMS', 'name': 'Ghost', 'meta': 'generator', 'regex': r'Ghost(?: ([\d.]+))?'},

    # Frontend Libraries & Frameworks
    {'category': 'JavaScript Framework', 'name': 'React', 'html': r'data-reactroot|__REACT_DEVTOOLS_GLOBAL_HOOK__|react\.production\.min\.js|_next/static'},
    {'category': 'JavaScript Framework', 'name': 'Vue.js', 'html': r'data-v-[a-zA-Z0-9]+|__vue__|vue\.runtime\.min\.js'},
    {'category': 'JavaScript Framework', 'name': 'Angular', 'html': r'ng-version|ng-app|<app-root'},
    {'category': 'JavaScript Framework', 'name': 'Next.js', 'html': r'__NEXT_DATA__|/_next/'},
    {'category': 'JavaScript Framework', 'name': 'Nuxt.js', 'html': r'__NUXT__|/_nuxt/'},
    {'category': 'JavaScript Library', 'name': 'jQuery', 'html': r'jquery[.-]([\d.]+)?(?:\.min)?\.js|jQuery\('},
    {'category': 'UI Framework', 'name': 'Bootstrap', 'html': r'bootstrap(?:\.min)?\.(?:css|js)'},
    {'category': 'UI Framework', 'name': 'Tailwind CSS', 'html': r'tailwind(?:\.min)?\.css'},
]

def detect_technologies(job_id: str, headers: dict, cookies: dict, html_content: str) -> list[dict]:
    """
    Analyzes HTTP response headers, cookies, and DOM content to fingerprint technologies.
    """
    detected = []
    seen = set()
    
    headers_lower = {k.lower(): v for k, v in headers.items()}
    cookies_lower = {k.lower(): v for k, v in cookies.items()}
    
    soup = None
    meta_generators = []
    if html_content:
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            for tag in soup.find_all('meta', attrs={'name': re.compile(r'^generator$', re.I)}):
                if tag.get('content'):
                    meta_generators.append(tag['content'])
        except Exception:
            pass

    for rule in TECH_RULES:
        name = rule['name']
        if name in seen:
            continue
            
        matched = False
        version = None
        evidence = None

        # Check Header
        if 'header' in rule:
            hdr_val = headers_lower.get(rule['header'])
            if hdr_val:
                m = re.search(rule['regex'], hdr_val, re.IGNORECASE)
                if m:
                    matched = True
                    version = m.group(1) if m.groups() and m.group(1) else None
                    evidence = f"Header '{rule['header']}: {hdr_val}'"

        # Check Cookie
        elif 'cookie' in rule:
            c_name = rule['cookie'].lower()
            if c_name in cookies_lower:
                matched = True
                evidence = f"Cookie '{rule['cookie']}' detected"

        # Check Meta Generator
        elif 'meta' in rule and meta_generators:
            for gen in meta_generators:
                m = re.search(rule['regex'], gen, re.IGNORECASE)
                if m:
                    matched = True
                    version = m.group(1) if m.groups() and m.group(1) else None
                    evidence = f"Meta tag generator: '{gen}'"
                    break

        # Check HTML content / script patterns
        elif 'html' in rule and html_content:
            m = re.search(rule['html'], html_content, re.IGNORECASE)
            if m:
                matched = True
                version = m.group(1) if m.groups() and m.group(1) else None
                evidence = f"Pattern match in HTML/JavaScript source"

        if matched:
            seen.add(name)
            tech_record = {
                'category': rule['category'],
                'name': name,
                'version': version,
                'confidence': 'High' if version or 'header' in rule else 'Medium',
                'evidence_text': evidence
            }
            detected.append(tech_record)
            add_scan_technology(
                job_id=job_id,
                category=rule['category'],
                name=name,
                version=version,
                confidence=tech_record['confidence'],
                evidence_text=evidence
            )

    return detected
