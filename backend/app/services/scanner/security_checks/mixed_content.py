"""
Mixed Content Assessment Engine
Audits HTTPS web pages for insecure resources loaded over plain HTTP.
"""
import uuid
import re
from bs4 import BeautifulSoup

def check_mixed_content(target_url: str, html_content: str) -> list[dict]:
    """
    Checks if an HTTPS webpage includes insecure HTTP subresources (scripts, images, stylesheets, iframes).
    """
    findings = []
    if not target_url.lower().startswith('https://') or not html_content:
        return findings

    insecure_resources = []
    try:
        soup = BeautifulSoup(html_content, 'html.parser')

        # Check scripts
        for script in soup.find_all('script', src=True):
            src = script['src'].strip()
            if src.lower().startswith('http://'):
                insecure_resources.append({'type': 'script', 'url': src})

        # Check stylesheets
        for link in soup.find_all('link', href=True):
            rel = [r.lower() for r in link.get('rel', [])]
            if 'stylesheet' in rel or 'preload' in rel:
                href = link['href'].strip()
                if href.lower().startswith('http://'):
                    insecure_resources.append({'type': 'stylesheet', 'url': href})

        # Check images
        for img in soup.find_all('img', src=True):
            src = img['src'].strip()
            if src.lower().startswith('http://'):
                insecure_resources.append({'type': 'image', 'url': src})

        # Check iframes
        for iframe in soup.find_all('iframe', src=True):
            src = iframe['src'].strip()
            if src.lower().startswith('http://'):
                insecure_resources.append({'type': 'iframe', 'url': src})

    except Exception:
        # Fallback to regex
        matches = re.findall(r'(?:src|href)=["\'](http://[^"\']+)["\']', html_content)
        for m in matches[:10]:
            insecure_resources.append({'type': 'resource', 'url': m})

    if insecure_resources:
        findings.append({
            'id': f"FND-MIXED-CONTENT-{uuid.uuid4().hex[:8]}",
            'title': "Mixed Content — HTTPS Page Loads Resources Over HTTP",
            'severity': "Medium",
            'confidence': "Confirmed",
            'category': "TLS/SSL",
            'affected_asset': target_url,
            'affected_url': target_url,
            'http_method': "GET",
            'parameter': "Subresources",
            'description': f"The HTTPS page loads {len(insecure_resources)} resource(s) over insecure HTTP, creating mixed content.",
            'impact': "Browsers block or warn about mixed content. Loaded HTTP resources can be intercepted and replaced by a MitM attacker, injecting malicious scripts or images.",
            'remediation': "Change all resource URLs to use HTTPS. Use protocol-relative URLs (//example.com/resource) or enforce HTTPS at CDN/origin level.",
            'references': [
                {"title": "MDN Mixed Content", "url": "https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content"},
                {"title": "CWE-311: Missing Encryption of Sensitive Data", "url": "https://cwe.mitre.org/data/definitions/311.html"}
            ],
            'evidence': {
                'insecure_resources_count': len(insecure_resources),
                'sample_resources': insecure_resources[:8]
            },
            'scanner_module': "MixedContentCheck"
        })

    return findings
